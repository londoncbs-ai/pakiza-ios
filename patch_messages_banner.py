import re

with open('src/app/(app)/messages.tsx', 'r') as f:
    content = f.read()

# Replace the current banner with the exact style
new_banner = """      <Pressable
        style={[{ flexDirection: 'row', alignItems: 'center', padding: spacing.md, marginHorizontal: spacing.md, marginBottom: spacing.md, borderRadius: radii.xl, borderWidth: StyleSheet.hairlineWidth }, { backgroundColor: c.surface, borderColor: c.border }, !isDark && shadow.soft]}
        onPress={() => router.push('/likes')}
      >
        <View style={[{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md }, { backgroundColor: palette.burgundy }]}>
          <Ionicons name="heart" size={20} color="white" />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="callout" tone="default" style={{ marginBottom: 2 }}>See who liked you</Text>
          <Text variant="footnote" tone="muted">Skip ahead to people already interested</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={c.textSubtle} />
      </Pressable>"""

content = re.sub(
    r'<Pressable\s*style=\{\[styles\.header[\s\S]*?</Pressable>',
    new_banner,
    content
)

with open('src/app/(app)/messages.tsx', 'w') as f:
    f.write(content)
