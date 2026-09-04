import re

with open('src/app/(app)/matches.tsx', 'r') as f:
    content = f.read()

# Replace Likes Banner with Find For Me Banner
find_for_me_banner = """      <Pressable
        style={[styles.likesBanner, { backgroundColor: c.surface, borderColor: c.border }, !isDark && shadow.soft]}
        onPress={() => router.push('/(app)/find-for-me' as any)}
      >
        <View style={[styles.likesIcon, { backgroundColor: palette.burgundy }]}>
          <Ionicons name="search" size={20} color="white" />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="callout" tone="default" style={styles.likesTitle}>Find for me</Text>
          <Text variant="footnote" tone="muted">Request a private search by a Match Advisor</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={c.textSubtle} />
      </Pressable>"""

content = re.sub(
    r'<Pressable[\s\S]*?styles\.likesBanner[\s\S]*?See who likes you[\s\S]*?</Pressable>',
    find_for_me_banner,
    content
)

with open('src/app/(app)/matches.tsx', 'w') as f:
    f.write(content)
