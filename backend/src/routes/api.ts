import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.ts';
import { authorizeRoles } from '../middlewares/rbac.ts';
import { uploadMiddleware } from '../middlewares/upload.ts';
import { login, logout, getMe, changePassword } from '../controllers/authController.ts';
import {
  getSantriList,
  getSantriRapor,
  createSantri,
  updateSantri,
  deleteSantri,
} from '../controllers/santriController.ts';
import {
  getViolations,
  createViolation,
  deleteViolation,
  getCounseling,
  createCounseling,
  deleteCounseling,
  getAchievements,
  createAchievement,
  deleteAchievement,
  getRoomsSummary,
  getPermissions,
  createPermission,
  updatePermissionStatus,
  deletePermission,
} from '../controllers/pembinaanController.ts';
import {
  getSppList,
  createSppRecord,
  toggleSppStatus,
  getPocketMoney,
  createPocketMoneyTx,
  getOperationalCash,
  createOperationalCash,
  deleteOperationalCash,
} from '../controllers/financeController.ts';
import {
  getUsers,
  createUser,
  updateUser,
  toggleUserActive,
  resetUserPassword,
  deleteUser,
  getActivityLogs,
} from '../controllers/userController.ts';
import { getDashboardSummary, handleFileUpload } from '../controllers/dashboardController.ts';

export const apiRouter = Router();

// 1. Auth Endpoints
apiRouter.post('/auth/login', login);
apiRouter.post('/auth/logout', authenticateToken, logout);
apiRouter.get('/auth/me', authenticateToken, getMe);
apiRouter.put('/auth/change-password', authenticateToken, changePassword);

// 2. Dashboard & Media Upload
apiRouter.get('/dashboard/summary', authenticateToken, getDashboardSummary);
apiRouter.post(
  '/upload',
  authenticateToken,
  authorizeRoles('admin', 'pembina', 'bendahara'),
  uploadMiddleware.single('file'),
  handleFileUpload
);

// 3. Santri Endpoints
// Admin, Pembina, dan Bendahara (Bendahara hanya GET)
apiRouter.get(
  '/santri',
  authenticateToken,
  authorizeRoles('admin', 'pembina', 'bendahara'),
  getSantriList
);
apiRouter.get(
  '/santri/:id/rapor',
  authenticateToken,
  authorizeRoles('admin', 'pembina', 'bendahara'),
  getSantriRapor
);
apiRouter.post(
  '/santri',
  authenticateToken,
  authorizeRoles('admin', 'pembina'),
  createSantri
);
apiRouter.put(
  '/santri/:id',
  authenticateToken,
  authorizeRoles('admin', 'pembina'),
  updateSantri
);
apiRouter.delete(
  '/santri/:id',
  authenticateToken,
  authorizeRoles('admin', 'pembina'),
  deleteSantri
);

// 4. Pembinaan: Pelanggaran, Konseling, Prestasi, Kamar & Perizinan (Admin & Pembina)
apiRouter.get(
  '/violations',
  authenticateToken,
  authorizeRoles('admin', 'pembina'),
  getViolations
);
apiRouter.post(
  '/violations',
  authenticateToken,
  authorizeRoles('admin', 'pembina'),
  createViolation
);
apiRouter.delete(
  '/violations/:id',
  authenticateToken,
  authorizeRoles('admin', 'pembina'),
  deleteViolation
);

apiRouter.get(
  '/counseling',
  authenticateToken,
  authorizeRoles('admin', 'pembina'),
  getCounseling
);
apiRouter.post(
  '/counseling',
  authenticateToken,
  authorizeRoles('admin', 'pembina'),
  createCounseling
);
apiRouter.delete(
  '/counseling/:id',
  authenticateToken,
  authorizeRoles('admin', 'pembina'),
  deleteCounseling
);

apiRouter.get(
  '/achievements',
  authenticateToken,
  authorizeRoles('admin', 'pembina'),
  getAchievements
);
apiRouter.post(
  '/achievements',
  authenticateToken,
  authorizeRoles('admin', 'pembina'),
  createAchievement
);
apiRouter.delete(
  '/achievements/:id',
  authenticateToken,
  authorizeRoles('admin', 'pembina'),
  deleteAchievement
);

apiRouter.get(
  '/rooms',
  authenticateToken,
  authorizeRoles('admin', 'pembina'),
  getRoomsSummary
);
apiRouter.get(
  '/permissions',
  authenticateToken,
  authorizeRoles('admin', 'pembina'),
  getPermissions
);
apiRouter.post(
  '/permissions',
  authenticateToken,
  authorizeRoles('admin', 'pembina'),
  createPermission
);
apiRouter.patch(
  '/permissions/:id/status',
  authenticateToken,
  authorizeRoles('admin', 'pembina'),
  updatePermissionStatus
);
apiRouter.delete(
  '/permissions/:id',
  authenticateToken,
  authorizeRoles('admin', 'pembina'),
  deletePermission
);

// 5. Keuangan: SPP, Uang Saku, Kas Operasional (Admin & Bendahara)
apiRouter.get(
  '/finance/spp',
  authenticateToken,
  authorizeRoles('admin', 'bendahara'),
  getSppList
);
apiRouter.post(
  '/finance/spp',
  authenticateToken,
  authorizeRoles('admin', 'bendahara'),
  createSppRecord
);
apiRouter.patch(
  '/finance/spp/:id/toggle',
  authenticateToken,
  authorizeRoles('admin', 'bendahara'),
  toggleSppStatus
);

apiRouter.get(
  '/finance/pocket-money',
  authenticateToken,
  authorizeRoles('admin', 'bendahara'),
  getPocketMoney
);
apiRouter.post(
  '/finance/pocket-money',
  authenticateToken,
  authorizeRoles('admin', 'bendahara'),
  createPocketMoneyTx
);

apiRouter.get(
  '/finance/operational-cash',
  authenticateToken,
  authorizeRoles('admin', 'bendahara'),
  getOperationalCash
);
apiRouter.post(
  '/finance/operational-cash',
  authenticateToken,
  authorizeRoles('admin', 'bendahara'),
  createOperationalCash
);
apiRouter.delete(
  '/finance/operational-cash/:id',
  authenticateToken,
  authorizeRoles('admin', 'bendahara'),
  deleteOperationalCash
);

// 6. Manajemen Pengguna & Log Aktivitas (Khusus Admin)
apiRouter.get('/users', authenticateToken, authorizeRoles('admin'), getUsers);
apiRouter.post('/users', authenticateToken, authorizeRoles('admin'), createUser);
apiRouter.put('/users/:id', authenticateToken, authorizeRoles('admin'), updateUser);
apiRouter.patch('/users/:id/toggle-active', authenticateToken, authorizeRoles('admin'), toggleUserActive);
apiRouter.patch('/users/:id/reset-password', authenticateToken, authorizeRoles('admin'), resetUserPassword);
apiRouter.delete('/users/:id', authenticateToken, authorizeRoles('admin'), deleteUser);
apiRouter.get('/activity-logs', authenticateToken, authorizeRoles('admin'), getActivityLogs);
