/**
 * Retorna uma saudação personalizada.
 * @param {string} nome - O nome para saudar.
 * @returns {string} A mensagem de saudação.
 */
function saudar(nome) {
  if (!nome || typeof nome !== 'string') {
    return "Olá, mundo!";
  }
  return `Olá, ${nome}!`;
}

/**
 * Retorna uma despedida personalizada.
 * @param {string} nome - O nome para se despedir.
 * @returns {string} A mensagem de despedida.
 */
function despedir(nome) {
  if (!nome || typeof nome !== 'string') {
    return "Até logo!";
  }
  return `Até logo, ${nome}!`;
}

// Exporta as funções para que possam ser usadas em outros projetos
module.exports = {
  saudar,
  despedir
};
