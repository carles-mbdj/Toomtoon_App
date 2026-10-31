import React from 'react';
import { useWindowDimensions } from 'react-native';
import RenderHtml from 'react-native-render-html';
import TableRenderer, { tableModel } from '@native-html/table-plugin';
import WebView from 'react-native-webview';
import { Colors } from '../constants/colors';

interface HtmlContentProps {
  html: string;
  /** Horizontal space already taken by the surrounding container's padding. */
  horizontalPadding?: number;
}

const tagsStyles = {
  body: { color: Colors.text, fontSize: 16, lineHeight: 26 },
  p: { marginBottom: 12 },
  h1: { color: Colors.text, fontSize: 24, fontWeight: '700' as const, marginVertical: 8 },
  h2: { color: Colors.text, fontSize: 20, fontWeight: '700' as const, marginVertical: 8 },
  strong: { fontWeight: '700' as const },
  em: { fontStyle: 'italic' as const },
  a: { color: Colors.primary, textDecorationLine: 'underline' as const },
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    paddingLeft: 12,
    marginVertical: 8,
    fontStyle: 'italic' as const,
    color: Colors.textSecondary,
  },
  li: { marginBottom: 4 },
  img: { borderRadius: 8, marginVertical: 8 },
};

/** Renders the HTML produced by the admin panel's rich text editor
 * (TipTap) - plain <Text> doesn't interpret HTML, it would just print
 * the raw tags as text. */
export const HtmlContent: React.FC<HtmlContentProps> = ({ html, horizontalPadding = 32 }) => {
  const { width } = useWindowDimensions();
  return (
    <RenderHtml
      contentWidth={width - horizontalPadding}
      source={{ html }}
      tagsStyles={tagsStyles}
      baseStyle={{ color: Colors.text, fontSize: 16, lineHeight: 26 }}
      WebView={WebView}
      renderers={{ table: TableRenderer }}
      customHTMLElementModels={{ table: tableModel }}
    />
  );
};
