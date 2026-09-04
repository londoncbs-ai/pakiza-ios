import re

with open('src/app/(app)/messages.tsx', 'r') as f:
    content = f.read()

# I will replace the single "See who liked you" banner with two small banners side-by-side or stacked.
new_banners = """
      <View style={{ flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.md, marginBottom: spacing.md }}>
        <Pressable
          style={[{ flex: 1, flexDirection: 'row', alignItems: 'center', padding: spacing.sm, borderRadius: radii.xl, borderWidth: StyleSheet.hairlineWidth }, { backgroundColor: c.surface, borderColor: c.border }, !isDark && shadow.soft]}
          onPress={() => router.push('/likes')}
        >
          <View style={[{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm }, { backgroundColor: palette.burgundy }]}>
            <Ionicons name="heart" size={18} color="white" />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="subhead" tone="default">Likes</Text>
          </View>
        </Pressable>

        <Pressable
          style={[{ flex: 1, flexDirection: 'row', alignItems: 'center', padding: spacing.sm, borderRadius: radii.xl, borderWidth: StyleSheet.hairlineWidth }, { backgroundColor: c.surface, borderColor: c.border }, !isDark && shadow.soft]}
          onPress={() => router.push('/(app)/matches' as any)}
        >
          <View style={[{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm }, { backgroundColor: palette.gold }]}>
            <Ionicons name="people" size={18} color="white" />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="subhead" tone="default">Matches</Text>
          </View>
        </Pressable>
      </View>
"""

content = re.sub(
    r'<Pressable\s*style=\{\[\{\s*flexDirection:\s*\'row\'[\s\S]*?</Pressable>',
    new_banners,
    content
)

with open('src/app/(app)/messages.tsx', 'w') as f:
    f.write(content)
