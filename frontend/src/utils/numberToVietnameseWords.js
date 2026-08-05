const defaultNumbers = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];

function readTriple(number, hasBorder) {
  let hundred = Math.floor(number / 100);
  let remainder = number % 100;
  let ten = Math.floor(remainder / 10);
  let unit = remainder % 10;
  let result = "";

  if (hasBorder || hundred > 0) {
    result += defaultNumbers[hundred] + " trăm ";
    if (ten === 0 && unit > 0) result += "lẻ ";
  }

  if (ten > 1) {
    result += defaultNumbers[ten] + " mươi ";
    if (unit === 1) result += "mốt ";
    else if (unit === 5) result += "lăm ";
    else if (unit > 0) result += defaultNumbers[unit] + " ";
  } else if (ten === 1) {
    result += "mười ";
    if (unit === 1) result += "một ";
    else if (unit === 5) result += "lăm ";
    else if (unit > 0) result += defaultNumbers[unit] + " ";
  } else if (hasBorder && unit > 0) {
    if (unit === 5) result += "lăm ";
    else result += defaultNumbers[unit] + " ";
  } else if (!hasBorder && unit > 0) {
    result += defaultNumbers[unit] + " ";
  }

  return result;
}

export function numberToVietnameseWords(n) {
  let num = Math.floor(Math.abs(Number(n) || 0));
  if (num === 0) return "Không đồng";

  const units = ["", "nghìn", "triệu", "tỷ", "nghìn tỷ", "triệu tỷ"];
  let str = "";
  let i = 0;

  while (num > 0) {
    let triple = num % 1000;
    if (triple > 0) {
      let tripleStr = readTriple(triple, num >= 1000);
      str = tripleStr + (units[i] ? units[i] + " " : "") + str;
    }
    num = Math.floor(num / 1000);
    i++;
  }

  str = str.trim().replace(/\s+/g, ' ');
  if (!str) return "Không đồng";

  // Capitalize first letter
  return str.charAt(0).toUpperCase() + str.slice(1) + " đồng";
}
