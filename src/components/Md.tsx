// Just enough Markdown for AI answers: **bold**, *italic*, "- " or "* " bullets, numbered lines, paragraphs.
import React from 'react';
import { Text, View } from 'react-native';

function inline(s: string, color: string) {
  const parts = s.split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/g).filter(Boolean);
  return parts.map((p, i) =>
    p.startsWith('**') ? <Text key={i} style={{ fontWeight: '800', color }}>{p.slice(2, -2)}</Text>
      : p.startsWith('*') && p.length > 2 ? <Text key={i} style={{ fontStyle: 'italic', color }}>{p.slice(1, -1)}</Text>
      : <Text key={i} style={{ color }}>{p}</Text>);
}

export default function Md({ text, color, size = 16 }: { text: string; color: string; size?: number }) {
  const lines = text.replace(/\r/g, '').split('\n');
  return (
    <View>
      {lines.map((raw, i) => {
        const line = raw.trimEnd();
        if (!line.trim()) return <View key={i} style={{ height: 8 }} />;
        const bullet = line.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)$/);
        if (bullet) {
          const mark = /^\s*\d/.test(line) ? line.trim().split(/\s/)[0] : '•';
          return (
            <View key={i} style={{ flexDirection: 'row', marginBottom: 4, paddingLeft: 4 }}>
              <Text style={{ color, fontSize: size, lineHeight: size * 1.55, width: 22 }}>{mark}</Text>
              <Text style={{ flex: 1, fontSize: size, lineHeight: size * 1.55 }}>{inline(bullet[1], color)}</Text>
            </View>
          );
        }
        const h = line.match(/^#{1,4}\s+(.*)$/);
        return <Text key={i} style={{ fontSize: h ? size + 1 : size, lineHeight: size * 1.55, fontWeight: h ? '800' : '400', marginBottom: 2 }}>{inline(h ? h[1] : line, color)}</Text>;
      })}
    </View>
  );
}
