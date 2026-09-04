import re

with open('src/app/(app)/find-for-me.tsx', 'r') as f:
    content = f.read()

# Fix the routing in submit success
content = content.replace("router.push('/(app)/match-advisors' as any)", "router.push('/')")

# Remove the whole "Become a Match Advisor" button and its container
content = re.sub(r'<View style={{ marginTop: spacing.md }}>\s*<Button label="Become a Match Advisor" [^>]+/>\s*</View>', '', content)

# Remove the 'Activate Find for me' toggle completely
content = re.sub(r'<ToggleRow\s+label="Activate Find for me"[\s\S]*?onDark={false}\s*/>', '', content)

# Change "Keep my profile private" to "Hide profile from public Discover"
content = content.replace('label="Keep my profile private"', 'label="Hide profile from public Discover"')
content = content.replace('Only the Match Advisor network sees your details, and your public profile stays hidden unless you choose to reveal it.', 'While your advisor searches for you, your profile will be completely hidden from the public Discover feed.')

with open('src/app/(app)/find-for-me.tsx', 'w') as f:
    f.write(content)
