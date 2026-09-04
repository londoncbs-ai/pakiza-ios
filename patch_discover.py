import re

with open('src/app/(app)/discover.tsx', 'r') as f:
    content = f.read()

content = content.replace("Platform.OS === 'ios' ? <DiscoverReel /> : <DiscoverDeck />", "<DiscoverReel />")

with open('src/app/(app)/discover.tsx', 'w') as f:
    f.write(content)
