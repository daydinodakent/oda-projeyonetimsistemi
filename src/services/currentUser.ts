import type { UserRole } from '../types/index';

// Uygulamada henüz oturum/kimlik doğrulama yok: giriş yapmış kullanıcı sabittir
// (profil menüsündeki kişi). Rol kontrolleri (ör. Harita > Kurumsal Altlık'ta
// yalnızca süper kullanıcının altlık ekleyebilmesi) buradan okunur — gerçek
// oturum geldiğinde yalnızca burası değişir.
export const CURRENT_USER: { name: string; role: UserRole } = {
  name: 'Ayhan Yılmaz',
  role: 'super_user',
};

export const isSuperUser = (): boolean => CURRENT_USER.role === 'super_user';
