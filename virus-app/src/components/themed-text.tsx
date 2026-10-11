import { StyleSheet, Text, type TextProps } from 'react-native';

import { Palette, Typography, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[
        { color: theme[themeColor ?? (type === 'small' ? 'textSecondary' : 'text')] },
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'subtitle' && styles.subtitle,
        type === 'link' && styles.link,
        type === 'linkPrimary' && styles.linkPrimary,
        type === 'code' && styles.code,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  small: {
    fontSize: 13,
    lineHeight: 21,
    fontFamily: Typography.body,
  },
  smallBold: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: Typography.semibold,
  },
  default: {
    fontSize: 15,
    lineHeight: 24,
    fontFamily: Typography.body,
  },
  title: {
    fontSize: 30,
    fontFamily: Typography.headingStrong,
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 24,
    lineHeight: 30,
    fontFamily: Typography.heading,
  },
  link: {
    lineHeight: 22,
    fontSize: 14,
    fontFamily: Typography.medium,
  },
  linkPrimary: {
    lineHeight: 22,
    fontSize: 14,
    fontFamily: Typography.medium,
    color: Palette.accent,
  },
  code: {
    fontFamily: Typography.medium,
    fontSize: 12,
  },
});
