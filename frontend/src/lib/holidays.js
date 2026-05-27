export const MOZAMBIQUE_HOLIDAYS = [
  { month: 1, day: 1, name: "Ano Novo" },
  { month: 2, day: 3, name: "Dia dos Heróis Moçambicanos" },
  { month: 4, day: 7, name: "Dia da Mulher Moçambicana" },
  { month: 5, day: 1, name: "Dia Internacional dos Trabalhadores" },
  { month: 6, day: 25, name: "Dia da Independência Nacional" },
  { month: 9, day: 7, name: "Dia da Vitória" },
  { month: 9, day: 25, name: "Dia das Forças Armadas" },
  { month: 10, day: 4, name: "Dia da Paz e Reconciliação" },
  { month: 12, day: 25, name: "Dia da Família (Natal)" },
  // New holidays
  { month: 3, day: 10, name: "Dia do ISPT" },
  { month: 6, day: 23, name: "Dia da Função Pública" },
  { month: 10, day: 12, name: "Dia dos Professores" },
  { month: 11, day: 17, name: "Dia Internacional dos Estudantes Universitários" }
];

export const getHolidaysForMonth = (month) => {
  return MOZAMBIQUE_HOLIDAYS.filter(h => h.month === month);
};
