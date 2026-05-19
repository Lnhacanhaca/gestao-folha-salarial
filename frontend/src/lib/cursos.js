/**
 * Centralised course mapping utilities.
 *
 * DB individual course IDs:
 *   2 = Contabilidade e Auditoria
 *   3 = Contabilidade e Administração Pública
 *   4 = Engenharia de Minas
 *   5 = Engenharia de Processamento Mineral
 *   6 = Engenharia Informática
 *
 * Director-anchor IDs stored in users.curso_id:
 *   2 → manages courses [2, 3]  (CA + CAP)
 *   4 → manages courses [4, 5]  (Minas + EPM)
 *   6 → manages courses [6]     (Informática)
 *
 * Report combined IDs (used in RelatoriosPage selectors & backend combined=true):
 *   1 = Geral (all courses)
 *   2 = CA + CAP  (backend expands to [2, 3])
 *   3 = Minas + EPM (backend expands to [4, 5])
 *   4 = Informática (backend expands to [6])
 */

// All 5 individual courses
export const CURSOS_INDIVIDUAIS = [
  { id: 2, nome: 'Contabilidade e Auditoria' },
  { id: 3, nome: 'Contabilidade e Administração Pública' },
  { id: 4, nome: 'Engenharia de Minas' },
  { id: 5, nome: 'Engenharia de Processamento Mineral' },
  { id: 6, nome: 'Engenharia Informática' },
];

export const CURSO_NOME = {
  2: 'Contabilidade e Auditoria',
  3: 'Contabilidade e Administração Pública',
  4: 'Engenharia de Minas',
  5: 'Engenharia de Processamento Mineral',
  6: 'Engenharia Informática',
};

/**
 * Given a user's curso_id from the DB, return the list of individual course IDs
 * that this user manages. ADMIN (or null) returns all.
 */
export function getManagedCourseIds(user) {
  if (!user || user.role === 'ADMIN') return [2, 3, 4, 5, 6];
  const cid = parseInt(user.curso_id);
  if (cid === 2 || cid === 3) return [2, 3];
  if (cid === 4 || cid === 5) return [4, 5];
  if (cid === 6) return [6];
  return [cid];
}

/**
 * Map a user's DB curso_id to the report combined ID used in
 * the RelatoriosPage selectors & the backend's `combined=true` parameter.
 *
 *   DB 2 or 3 → report 2  (CA + CAP)
 *   DB 4 or 5 → report 3  (Minas + EPM)
 *   DB 6      → report 4  (Informática)
 */
export function dbCursoIdToReportId(dbCursoId) {
  const cid = parseInt(dbCursoId);
  if (cid === 2 || cid === 3) return 2;
  if (cid === 4 || cid === 5) return 3;
  if (cid === 6) return 4;
  return cid; // fallback
}

/**
 * Map a report combined ID to the list of DB individual course IDs.
 */
export function reportIdToDbCursoIds(reportId) {
  const rid = parseInt(reportId);
  if (rid === 1) return [2, 3, 4, 5, 6]; // Geral
  if (rid === 2) return [2, 3];
  if (rid === 3) return [4, 5];
  if (rid === 4) return [6];
  return [rid];
}

/**
 * Label for the "cursos geridos" shown on user cards / dashboard.
 */
export const CURSOS_GERIDOS_LABEL = {
  2: 'Contabilidade e Auditoria + Contabilidade e Administração Pública',
  3: 'Contabilidade e Auditoria + Contabilidade e Administração Pública',
  4: 'Engenharia de Minas + Processamento Mineral',
  5: 'Engenharia de Minas + Processamento Mineral',
  6: 'Engenharia Informática',
};

/**
 * Report selector options (combined courses for reports).
 */
export const REPORT_COURSE_OPTIONS = [
  { value: 1, label: 'Geral (Todos os Cursos)' },
  { value: 2, label: 'Contabilidade e Auditoria e Contabilidade e Administração Pública' },
  { value: 3, label: 'Engenharia de Minas e Engenharia de Processamento Mineral' },
  { value: 4, label: 'Engenharia Informática' },
];

/**
 * LancarNotas selector options (individual courses).
 */
export const LANCAR_COURSE_OPTIONS = [
  { value: 1, label: 'Geral (Consolidado)' },
  { value: 2, label: 'Contabilidade e Auditoria' },
  { value: 3, label: 'Contabilidade e Administração Pública' },
  { value: 4, label: 'Engenharia de Minas' },
  { value: 5, label: 'Engenharia de Processamento Mineral' },
  { value: 6, label: 'Engenharia Informática' },
];
