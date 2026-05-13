export function parseCustomerAddress(fullAddress: string): {
  address?: string;
  streetNumber?: string;
  postalCode?: string;
  city?: string;
  province?: string;
  country?: string;
} {
  if (!fullAddress) return {};

  const parts = fullAddress.split(',');
  const address = parts[0]?.trim();
  const province = parts[2]?.trim();
  const country = parts[3]?.trim();

  let streetNumber = '';
  let postalCode = '';
  let city = '';

  if (parts[1]) {
    const middleParts = parts[1].split('-');
    streetNumber = middleParts[0]?.trim();

    if (middleParts[1]) {
      const postalCodeAndCity = middleParts[1].trim();
      postalCode = postalCodeAndCity.substring(0, 5);
      city = postalCodeAndCity.substring(5).trim();
    }
  }

  return {
    address,
    streetNumber,
    postalCode,
    city,
    province,
    country,
  };
}
