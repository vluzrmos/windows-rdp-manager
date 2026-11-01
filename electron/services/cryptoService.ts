import { safeStorage } from 'electron';
import crypto from 'crypto';

export class CryptoService {
  /**
   * Criptografa uma string usando a Windows DPAPI (via safeStorage do Electron).
   * O dado é protegido pela chave do usuário do Windows no hardware local.
   * Sem DPAPI disponível, falha em vez de gravar a senha com uma proteção fraca.
   */
  static encrypt(plainText: string): string {
    if (!plainText) return '';
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('Criptografia do Windows (DPAPI) indisponível: a senha não foi salva.');
    }
    return 'dpapi:' + safeStorage.encryptString(plainText).toString('base64');
  }

  /**
   * Descriptografa uma string usando a Windows DPAPI (via safeStorage).
   * Valores "fallback:" de versões anteriores ainda são lidos; qualquer outro formato é rejeitado.
   */
  static decrypt(cipherText: string): string {
    if (!cipherText) return '';
    try {
      if (cipherText.startsWith('dpapi:')) {
        return safeStorage.decryptString(Buffer.from(cipherText.substring(6), 'base64'));
      }
      if (cipherText.startsWith('fallback:')) {
        return this.legacyFallbackDecrypt(cipherText);
      }
    } catch (err) {
      console.error('Falha ao descriptografar senha:', err);
    }
    return '';
  }

  /**
   * Criptografa dados para exportação protegida por senha mestra (AES-256-GCM + PBKDF2)
   */
  static exportWithPassword(data: unknown, masterPassword: string): string {
    const salt = crypto.randomBytes(16);
    const key = crypto.pbkdf2Sync(masterPassword, salt, 100000, 32, 'sha256');
    const iv = crypto.randomBytes(12);

    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const jsonString = JSON.stringify(data);
    let encrypted = cipher.update(jsonString, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag();

    return JSON.stringify({
      salt: salt.toString('hex'),
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
      data: encrypted,
      version: '1.0'
    });
  }

  /**
   * Descriptografa arquivo importado com senha mestra
   */
  static importWithPassword<T>(payload: string, masterPassword: string): T {
    const parsed = JSON.parse(payload);
    const salt = Buffer.from(parsed.salt, 'hex');
    const iv = Buffer.from(parsed.iv, 'hex');
    const tag = Buffer.from(parsed.tag, 'hex');
    const encryptedText = parsed.data;

    const key = crypto.pbkdf2Sync(masterPassword, salt, 100000, 32, 'sha256');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted) as T;
  }

  // Leitura do antigo fallback (chave derivada do nome do computador); não é mais usado para gravar
  private static legacyFallbackDecrypt(cipherText: string): string {
    const parts = cipherText.split(':');
    if (parts.length < 4) return '';
    const key = crypto.scryptSync(process.env.COMPUTERNAME || 'rdp-manager-local', 'rdp-salt-2025', 32);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(parts[1], 'hex'));
    decipher.setAuthTag(Buffer.from(parts[2], 'hex'));
    return decipher.update(parts[3], 'hex', 'utf8') + decipher.final('utf8');
  }
}
