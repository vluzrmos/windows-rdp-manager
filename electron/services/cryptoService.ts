import { safeStorage } from 'electron';
import crypto from 'crypto';

export class CryptoService {
  /**
   * Criptografa uma string usando a Windows DPAPI (via safeStorage do Electron).
   * O dado é protegido pela chave do usuário do Windows no hardware local.
   */
  static encrypt(plainText: string): string {
    if (!plainText) return '';
    try {
      if (safeStorage.isEncryptionAvailable()) {
        const encryptedBuffer = safeStorage.encryptString(plainText);
        return 'dpapi:' + encryptedBuffer.toString('base64');
      }
    } catch (err) {
      console.warn('safeStorage não disponível ou falhou, usando fallback criptográfico:', err);
    }

    // Fallback caso safeStorage não esteja disponível
    return this.fallbackEncrypt(plainText);
  }

  /**
   * Descriptografa uma string usando a Windows DPAPI (via safeStorage).
   */
  static decrypt(cipherText: string): string {
    if (!cipherText) return '';
    try {
      if (cipherText.startsWith('dpapi:')) {
        const base64Data = cipherText.substring(6);
        const buffer = Buffer.from(base64Data, 'base64');
        return safeStorage.decryptString(buffer);
      }
    } catch (err) {
      console.error('Falha ao descriptografar com DPAPI:', err);
    }

    // Tentar fallback se não for prefixo dpapi
    try {
      return this.fallbackDecrypt(cipherText);
    } catch (err) {
      console.error('Falha no fallback de descriptografia:', err);
      return '';
    }
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

  // Fallback interno com AES-256-GCM para ambientes sem DPAPI
  private static readonly fallbackKey = crypto.scryptSync(process.env.COMPUTERNAME || 'rdp-manager-local', 'rdp-salt-2025', 32);

  private static fallbackEncrypt(text: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.fallbackKey, iv);
    let enc = cipher.update(text, 'utf8', 'hex');
    enc += cipher.final('hex');
    const tag = cipher.getAuthTag();
    return `fallback:${iv.toString('hex')}:${tag.toString('hex')}:${enc}`;
  }

  private static fallbackDecrypt(cipherText: string): string {
    if (!cipherText.startsWith('fallback:')) return cipherText;
    const parts = cipherText.split(':');
    if (parts.length < 4) return '';
    const iv = Buffer.from(parts[1], 'hex');
    const tag = Buffer.from(parts[2], 'hex');
    const enc = parts[3];
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.fallbackKey, iv);
    decipher.setAuthTag(tag);
    let dec = decipher.update(enc, 'hex', 'utf8');
    dec += decipher.final('utf8');
    return dec;
  }
}
