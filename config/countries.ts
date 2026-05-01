/**
 * Country catalogue.
 *
 * Stored value: ISO 3166-1 alpha-2 code on profiles.country.
 * Display: flag emoji + French name.
 *
 * The four "Songo home countries" appear first as a featured group,
 * then the rest of Africa alphabetically, then the rest of the world.
 * Not exhaustive — curated to keep the picker manageable.
 */

export interface Country {
  code: string;
  name: string;
  flag: string; // Emoji flag
}

/** Songo home countries — featured at the top of the picker. */
export const SONGO_HOME_COUNTRIES: Country[] = [
  { code: 'CM', name: 'Cameroun',           flag: '🇨🇲' },
  { code: 'GA', name: 'Gabon',              flag: '🇬🇦' },
  { code: 'GQ', name: 'Guinée Équatoriale', flag: '🇬🇶' },
  { code: 'CG', name: 'Congo',              flag: '🇨🇬' },
];

/** Rest of Africa — alphabetical by French name. */
export const AFRICA_COUNTRIES: Country[] = [
  { code: 'DZ', name: 'Algérie',                       flag: '🇩🇿' },
  { code: 'AO', name: 'Angola',                        flag: '🇦🇴' },
  { code: 'BJ', name: 'Bénin',                         flag: '🇧🇯' },
  { code: 'BW', name: 'Botswana',                      flag: '🇧🇼' },
  { code: 'BF', name: 'Burkina Faso',                  flag: '🇧🇫' },
  { code: 'BI', name: 'Burundi',                       flag: '🇧🇮' },
  { code: 'CV', name: 'Cap-Vert',                      flag: '🇨🇻' },
  { code: 'CF', name: 'Centrafrique',                  flag: '🇨🇫' },
  { code: 'CD', name: 'Congo (RDC)',                   flag: '🇨🇩' },
  { code: 'CI', name: 'Côte d’Ivoire',            flag: '🇨🇮' },
  { code: 'DJ', name: 'Djibouti',                      flag: '🇩🇯' },
  { code: 'EG', name: 'Égypte',                        flag: '🇪🇬' },
  { code: 'ER', name: 'Érythrée',                      flag: '🇪🇷' },
  { code: 'SZ', name: 'Eswatini',                      flag: '🇸🇿' },
  { code: 'ET', name: 'Éthiopie',                      flag: '🇪🇹' },
  { code: 'GM', name: 'Gambie',                        flag: '🇬🇲' },
  { code: 'GH', name: 'Ghana',                         flag: '🇬🇭' },
  { code: 'GN', name: 'Guinée',                        flag: '🇬🇳' },
  { code: 'GW', name: 'Guinée-Bissau',                 flag: '🇬🇼' },
  { code: 'KE', name: 'Kenya',                         flag: '🇰🇪' },
  { code: 'LS', name: 'Lesotho',                       flag: '🇱🇸' },
  { code: 'LR', name: 'Libéria',                       flag: '🇱🇷' },
  { code: 'LY', name: 'Libye',                         flag: '🇱🇾' },
  { code: 'MG', name: 'Madagascar',                    flag: '🇲🇬' },
  { code: 'MW', name: 'Malawi',                        flag: '🇲🇼' },
  { code: 'ML', name: 'Mali',                          flag: '🇲🇱' },
  { code: 'MA', name: 'Maroc',                         flag: '🇲🇦' },
  { code: 'MU', name: 'Maurice',                       flag: '🇲🇺' },
  { code: 'MR', name: 'Mauritanie',                    flag: '🇲🇷' },
  { code: 'MZ', name: 'Mozambique',                    flag: '🇲🇿' },
  { code: 'NA', name: 'Namibie',                       flag: '🇳🇦' },
  { code: 'NE', name: 'Niger',                         flag: '🇳🇪' },
  { code: 'NG', name: 'Nigéria',                       flag: '🇳🇬' },
  { code: 'UG', name: 'Ouganda',                       flag: '🇺🇬' },
  { code: 'RW', name: 'Rwanda',                        flag: '🇷🇼' },
  { code: 'ST', name: 'São Tomé-et-Príncipe',          flag: '🇸🇹' },
  { code: 'SN', name: 'Sénégal',                       flag: '🇸🇳' },
  { code: 'SC', name: 'Seychelles',                    flag: '🇸🇨' },
  { code: 'SL', name: 'Sierra Leone',                  flag: '🇸🇱' },
  { code: 'SO', name: 'Somalie',                       flag: '🇸🇴' },
  { code: 'SD', name: 'Soudan',                        flag: '🇸🇩' },
  { code: 'SS', name: 'Soudan du Sud',                 flag: '🇸🇸' },
  { code: 'ZA', name: 'Afrique du Sud',                flag: '🇿🇦' },
  { code: 'TZ', name: 'Tanzanie',                      flag: '🇹🇿' },
  { code: 'TD', name: 'Tchad',                         flag: '🇹🇩' },
  { code: 'TG', name: 'Togo',                          flag: '🇹🇬' },
  { code: 'TN', name: 'Tunisie',                       flag: '🇹🇳' },
  { code: 'ZM', name: 'Zambie',                        flag: '🇿🇲' },
  { code: 'ZW', name: 'Zimbabwe',                      flag: '🇿🇼' },
];

/** Rest of the world — alphabetical, curated. */
export const WORLD_COUNTRIES: Country[] = [
  { code: 'DE', name: 'Allemagne',                     flag: '🇩🇪' },
  { code: 'AR', name: 'Argentine',                     flag: '🇦🇷' },
  { code: 'AU', name: 'Australie',                     flag: '🇦🇺' },
  { code: 'AT', name: 'Autriche',                      flag: '🇦🇹' },
  { code: 'BE', name: 'Belgique',                      flag: '🇧🇪' },
  { code: 'BR', name: 'Brésil',                        flag: '🇧🇷' },
  { code: 'BG', name: 'Bulgarie',                      flag: '🇧🇬' },
  { code: 'CA', name: 'Canada',                        flag: '🇨🇦' },
  { code: 'CL', name: 'Chili',                         flag: '🇨🇱' },
  { code: 'CN', name: 'Chine',                         flag: '🇨🇳' },
  { code: 'CO', name: 'Colombie',                      flag: '🇨🇴' },
  { code: 'KR', name: 'Corée du Sud',                  flag: '🇰🇷' },
  { code: 'HR', name: 'Croatie',                       flag: '🇭🇷' },
  { code: 'CU', name: 'Cuba',                          flag: '🇨🇺' },
  { code: 'DK', name: 'Danemark',                      flag: '🇩🇰' },
  { code: 'AE', name: 'Émirats arabes unis',           flag: '🇦🇪' },
  { code: 'ES', name: 'Espagne',                       flag: '🇪🇸' },
  { code: 'EE', name: 'Estonie',                       flag: '🇪🇪' },
  { code: 'US', name: 'États-Unis',                    flag: '🇺🇸' },
  { code: 'FI', name: 'Finlande',                      flag: '🇫🇮' },
  { code: 'FR', name: 'France',                        flag: '🇫🇷' },
  { code: 'GR', name: 'Grèce',                         flag: '🇬🇷' },
  { code: 'HK', name: 'Hong Kong',                     flag: '🇭🇰' },
  { code: 'HU', name: 'Hongrie',                       flag: '🇭🇺' },
  { code: 'IN', name: 'Inde',                          flag: '🇮🇳' },
  { code: 'ID', name: 'Indonésie',                     flag: '🇮🇩' },
  { code: 'IQ', name: 'Irak',                          flag: '🇮🇶' },
  { code: 'IR', name: 'Iran',                          flag: '🇮🇷' },
  { code: 'IE', name: 'Irlande',                       flag: '🇮🇪' },
  { code: 'IS', name: 'Islande',                       flag: '🇮🇸' },
  { code: 'IL', name: 'Israël',                        flag: '🇮🇱' },
  { code: 'IT', name: 'Italie',                        flag: '🇮🇹' },
  { code: 'JP', name: 'Japon',                         flag: '🇯🇵' },
  { code: 'JO', name: 'Jordanie',                      flag: '🇯🇴' },
  { code: 'LB', name: 'Liban',                         flag: '🇱🇧' },
  { code: 'LU', name: 'Luxembourg',                    flag: '🇱🇺' },
  { code: 'MY', name: 'Malaisie',                      flag: '🇲🇾' },
  { code: 'MX', name: 'Mexique',                       flag: '🇲🇽' },
  { code: 'NO', name: 'Norvège',                       flag: '🇳🇴' },
  { code: 'NZ', name: 'Nouvelle-Zélande',              flag: '🇳🇿' },
  { code: 'NL', name: 'Pays-Bas',                      flag: '🇳🇱' },
  { code: 'PE', name: 'Pérou',                         flag: '🇵🇪' },
  { code: 'PH', name: 'Philippines',                   flag: '🇵🇭' },
  { code: 'PL', name: 'Pologne',                       flag: '🇵🇱' },
  { code: 'PT', name: 'Portugal',                      flag: '🇵🇹' },
  { code: 'QA', name: 'Qatar',                         flag: '🇶🇦' },
  { code: 'RO', name: 'Roumanie',                      flag: '🇷🇴' },
  { code: 'GB', name: 'Royaume-Uni',                   flag: '🇬🇧' },
  { code: 'RU', name: 'Russie',                        flag: '🇷🇺' },
  { code: 'SA', name: 'Arabie saoudite',               flag: '🇸🇦' },
  { code: 'CH', name: 'Suisse',                        flag: '🇨🇭' },
  { code: 'SE', name: 'Suède',                         flag: '🇸🇪' },
  { code: 'SG', name: 'Singapour',                     flag: '🇸🇬' },
  { code: 'TH', name: 'Thaïlande',                     flag: '🇹🇭' },
  { code: 'TR', name: 'Turquie',                       flag: '🇹🇷' },
  { code: 'UA', name: 'Ukraine',                       flag: '🇺🇦' },
  { code: 'UY', name: 'Uruguay',                       flag: '🇺🇾' },
  { code: 'VE', name: 'Venezuela',                     flag: '🇻🇪' },
  { code: 'VN', name: 'Vietnam',                       flag: '🇻🇳' },
];

/** Flat lookup of all countries. */
export const ALL_COUNTRIES: Country[] = [
  ...SONGO_HOME_COUNTRIES,
  ...AFRICA_COUNTRIES,
  ...WORLD_COUNTRIES,
];

const COUNTRY_BY_CODE: Record<string, Country> = ALL_COUNTRIES.reduce(
  (acc, c) => {
    acc[c.code] = c;
    return acc;
  },
  {} as Record<string, Country>
);

export function getCountry(code: string | null | undefined): Country | null {
  if (!code) return null;
  return COUNTRY_BY_CODE[code.toUpperCase()] || null;
}

/** Pretty inline display — flag + name. */
export function formatCountry(code: string | null | undefined, fallback = '—'): string {
  const c = getCountry(code);
  return c ? `${c.flag} ${c.name}` : fallback;
}
