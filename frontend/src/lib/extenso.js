export function numeroPorExtenso(numero) {
    if (numero === 0) return 'Zero Meticais';

    const unidades = ['', 'Um', 'Dois', 'Três', 'Quatro', 'Cinco', 'Seis', 'Sete', 'Oito', 'Nove'];
    const dezenas = ['', 'Dez', 'Vinte', 'Trinta', 'Quarenta', 'Cinquenta', 'Sessenta', 'Setenta', 'Oitenta', 'Noventa'];
    const dezenasEspeciais = ['Dez', 'Onze', 'Doze', 'Treze', 'Catorze', 'Quinze', 'Dezasseis', 'Dezassete', 'Dezoito', 'Dezanove'];
    const centenas = ['', 'Cento', 'Duzentos', 'Trezentos', 'Quatrocentos', 'Quinhentos', 'Seiscentos', 'Setecentos', 'Oitocentos', 'Novecentos'];

    function converteCentena(n) {
        if (n === 100) return 'Cem';
        let str = '';
        const c = Math.floor(n / 100);
        const d = Math.floor((n % 100) / 10);
        const u = n % 10;

        if (c > 0) str += centenas[c];
        if (d === 1) {
            if (str !== '') str += ' e ';
            str += dezenasEspeciais[u];
            return str;
        }
        if (d > 1) {
            if (str !== '') str += ' e ';
            str += dezenas[d];
        }
        if (u > 0) {
            if (str !== '') str += ' e ';
            str += unidades[u];
        }
        return str;
    }

    const intPart = Math.floor(numero);
    const decPart = Math.round((numero - intPart) * 100);

    let extenso = '';

    if (intPart > 0) {
        const milhoes = Math.floor(intPart / 1000000);
        const milhares = Math.floor((intPart % 1000000) / 1000);
        const restos = intPart % 1000;

        if (milhoes > 0) {
            extenso += converteCentena(milhoes) + (milhoes === 1 ? ' Milhão' : ' Milhões');
        }
        if (milhares > 0) {
            if (extenso !== '') {
                extenso += ' e ';
            }
            if (milhares === 1 && extenso === '') extenso += 'Mil';
            else extenso += converteCentena(milhares) + ' Mil';
        }
        if (restos > 0) {
            if (extenso !== '') {
                extenso += ' e ';
            }
            extenso += converteCentena(restos);
        }
        extenso += (intPart === 1 && extenso === 'Um') ? ' Metical' : ' Meticais';
    }

    if (decPart > 0) {
        if (extenso !== '') extenso += ' e ';
        extenso += converteCentena(decPart) + (decPart === 1 ? ' Centavo' : ' Centavos');
    }

    return extenso;
}
