const UTF8_BOM = [0xef, 0xbb, 0xbf] as const;

const DXF_CODEPAGE_TO_ENCODING: Record<string, string> = {
  ANSI_1250: 'windows-1250',
  ANSI_1251: 'windows-1251',
  ANSI_1252: 'windows-1252',
  ANSI_1253: 'windows-1253',
  ANSI_1254: 'windows-1254',
  ANSI_1255: 'windows-1255',
  ANSI_1256: 'windows-1256',
  ANSI_1257: 'windows-1257',
  ANSI_1258: 'windows-1258',
  ANSI_932: 'shift_jis',
  ANSI_936: 'gbk',
  ANSI_949: 'euc-kr',
  ANSI_950: 'big5',
  'UTF-8': 'utf-8',
  UTF8: 'utf-8'
};

const countReplacementCharacters = (value: string): number => (
  Array.from(value).filter((character) => character === '\uFFFD').length
);

const hasUtf8Bom = (bytes: Uint8Array): boolean => (
  bytes.length >= UTF8_BOM.length
  && UTF8_BOM.every((value, index) => bytes[index] === value)
);

const isUtf8MisinterpretedAsAnsi = (ansiText: string): boolean => {
  // Padrões muito comuns quando UTF-8 é lido como Windows-1252 (Português)
  // Ã‰ = É, Ã‡ = Ç, Ã£ = ã, Ã¡ = á, Ã© = é, Ã³ = ó, Ãº = ú, Ãª = ê, Ã§ = ç, Ã = À/Á/Â/Ã
  const mojibakePatterns = [
    'Ã‰', 'Ã‡', 'Ã£', 'Ã¡', 'Ã©', 'Ã³', 'Ãº', 'Ãª', 'Ã§', 'Ãµ', 'Ã¢', 'Ãµes', 'Ã§Ãµes'
  ];
  let score = 0;
  for (const pattern of mojibakePatterns) {
    if (ansiText.includes(pattern)) {
      score += 1;
    }
  }
  return score > 0;
};

const extractDeclaredDxfEncoding = (probeText: string): string | null => {
  const lines = probeText.split(/\r?\n/).map((line) => line.trim());
  for (let index = 0; index < lines.length - 3; index += 1) {
    if (lines[index] === '9' && lines[index + 1] === '$DWGCODEPAGE' && lines[index + 2] === '3') {
      const declaredCodePage = lines[index + 3]?.toUpperCase();
      if (!declaredCodePage) {
        return null;
      }

      return DXF_CODEPAGE_TO_ENCODING[declaredCodePage] ?? null;
    }
  }

  return null;
};

const decodeWithEncoding = (buffer: ArrayBuffer, encoding: string): string => (
  new TextDecoder(encoding).decode(buffer)
);

export const decodeDxfTextBuffer = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  if (hasUtf8Bom(bytes)) {
    return decodeWithEncoding(buffer, 'utf-8');
  }

  // Se o arquivo for um UTF-8 válido (sem replacement characters), confiamos nisso primeiro.
  const utf8Text = decodeWithEncoding(buffer, 'utf-8');
  const utf8ReplacementCount = countReplacementCharacters(utf8Text);
  if (utf8ReplacementCount === 0) {
    return utf8Text;
  }

  // Faz um probe com Windows-1252
  const singleByteProbe = decodeWithEncoding(buffer, 'windows-1252');
  
  // Se o probe ANSI contiver muitos padrões de Mojibake (ex: VÃ‰RTICE), 
  // significa que o arquivo é na verdade UTF-8, mas tem alguns bytes binários inválidos
  // que fizeram o utf8ReplacementCount > 0. Nesse caso, é melhor usar o UTF-8.
  if (isUtf8MisinterpretedAsAnsi(singleByteProbe)) {
    return utf8Text;
  }

  const declaredEncoding = extractDeclaredDxfEncoding(singleByteProbe);
  if (declaredEncoding) {
    return decodeWithEncoding(buffer, declaredEncoding);
  }

  return singleByteProbe;
};

export const readDxfFileAsText = async (file: Blob): Promise<string> => {
  const buffer = await file.arrayBuffer();
  return decodeDxfTextBuffer(buffer);
};
