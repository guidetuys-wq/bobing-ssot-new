// lib/utils.js
export const formatRupiah = (n) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(n);
};

export const sizeRank = ['ALL','ALL SIZE','ALLSIZE','XXXS','XXS','XS','S','M','L','XL','XXL','2XL','3XL','XXXL','4XL','5XL'];

export const sortBySize = (variantA, variantB) => {
  const sizeA = (variantA.size || '').toUpperCase().trim();
  const sizeB = (variantB.size || '').toUpperCase().trim();
  const idxA = sizeRank.indexOf(sizeA);
  const idxB = sizeRank.indexOf(sizeB);
  
  if (idxA !== -1 && idxB !== -1) return idxA - idxB;
  if (idxA !== -1) return -1; 
  if (idxB !== -1) return 1;
  
  const colorCompare = (variantA.color || '').localeCompare(variantB.color || '');
  if (colorCompare !== 0) return colorCompare;
  
  return (variantA.sku || '').localeCompare(variantB.sku || '');
};