import re

with open('src/app/(app)/messages.tsx', 'r') as f:
    content = f.read()

# Add a Likes banner below the header
likes_banner = """
      <Pressable 
        style={[styles.header, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: c.surfaceAlt, marginTop: spacing.sm, paddingVertical: spacing.md, paddingHorizontal: spacing.lg }]}
        onPress={() => router.push('/(app)/matches' as any)}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: palette.burgundy, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="heart" size={20} color="white" />
          </View>
          <View>
            <Text variant="subhead">See who liked you</Text>
            <Text variant="footnote" tone="muted">View your likes and matches</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={c.textSubtle} />
      </Pressable>
"""

content = content.replace('      </View>\n\n      {loading ? (', '      </View>\n' + likes_banner + '\n      {loading ? (')

with open('src/app/(app)/messages.tsx', 'w') as f:
    f.write(content)
