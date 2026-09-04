import re

with open('src/app/(app)/_layout.tsx', 'r') as f:
    content = f.read()

content = content.replace("      <Tabs.Screen name=\"requests/[id]\" options={{ href: null }} />\\n", "")
content = content.replace("      <Tabs.Screen name=\"requests/chat/[offerId]\" options={{ href: null }} />\\n", "")

with open('src/app/(app)/_layout.tsx', 'w') as f:
    f.write(content)
