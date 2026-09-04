import re

with open('src/app/(app)/matches.tsx', 'r') as f:
    content = f.read()

content = re.sub(
    r'<Pressable\s*style=\{\[styles\.likesBanner[\s\S]*?</Pressable>',
    '',
    content
)

with open('src/app/(app)/matches.tsx', 'w') as f:
    f.write(content)
