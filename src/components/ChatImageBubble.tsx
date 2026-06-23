import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { palette, radii } from '@/theme';

interface ChatImageBubbleProps {
  /** Presigned GET url for the image. */
  url: string | null;
}

const MAX_W = 240;
const MAX_H = 300;

/**
 * An image message body: a rounded thumbnail that, on tap, opens the picture
 * fullscreen in a dark modal with a close button.
 */
export function ChatImageBubble({ url }: ChatImageBubbleProps) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  if (!url) return null;

  return (
    <>
      <Pressable onPress={() => setOpen(true)} accessibilityRole="imagebutton">
        <Image
          source={{ uri: url }}
          style={styles.thumb}
          contentFit="cover"
          transition={140}
        />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.viewer}>
          <Pressable style={styles.viewerBackdrop} onPress={() => setOpen(false)}>
            <Image source={{ uri: url }} style={styles.full} contentFit="contain" transition={120} />
          </Pressable>
          <Pressable
            onPress={() => setOpen(false)}
            hitSlop={12}
            style={[styles.close, { top: insets.top + 8 }]}
          >
            <Ionicons name="close" size={26} color={palette.cream} />
          </Pressable>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  thumb: { width: MAX_W, height: MAX_H, borderRadius: radii.lg, backgroundColor: 'rgba(0,0,0,0.06)' },
  viewer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.94)' },
  viewerBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  full: { width: '100%', height: '100%' },
  close: { position: 'absolute', right: 16, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});
