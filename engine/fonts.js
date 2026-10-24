// Fonts shared by every scene. Files live in /fonts; all are SIL Open Font License 1.1
// (free for commercial use, including rendering into videos).
export const SANS = '"Noto Sans SC"'; // 思源黑体 (Noto Sans SC), variable weight 100–900
export const OLD = '"IM Fell French Canon"'; // 18th-century French print look, regular + italic
export const MONO = '"Source Code Pro"'; // counters and numbers, variable weight 200–900

const FILES = [
  { family: 'Noto Sans SC', url: '/fonts/NotoSansSC-VF.otf', descriptors: { weight: '100 900' } },
  { family: 'IM Fell French Canon', url: '/fonts/IMFellFrenchCanon-Regular.ttf', descriptors: { style: 'normal' } },
  { family: 'IM Fell French Canon', url: '/fonts/IMFellFrenchCanon-Italic.ttf', descriptors: { style: 'italic' } },
  { family: 'Source Code Pro', url: '/fonts/SourceCodePro-VF.ttf', descriptors: { weight: '200 900' } },
];

export async function loadFonts() {
  await Promise.all(
    FILES.map(async (f) => {
      const face = new FontFace(f.family, `url(${f.url})`, f.descriptors);
      await face.load();
      document.fonts.add(face);
    }),
  );
}
