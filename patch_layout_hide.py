import re

with open('src/app/(app)/_layout.tsx', 'r') as f:
    content = f.read()

hide_screens = """      <Tabs.Screen name="explore" options={{ href: null }} />
      <Tabs.Screen name="matches" options={{ href: null }} />
      <Tabs.Screen name="find-for-me" options={{ href: null }} />
      <Tabs.Screen name="create-request" options={{ href: null }} />
      <Tabs.Screen name="requests" options={{ href: null }} />"""

content = re.sub(
    r'<Tabs\.Screen name="explore".*?\n.*?</Tabs>',
    hide_screens + '\n    </Tabs>',
    content,
    flags=re.DOTALL
)

with open('src/app/(app)/_layout.tsx', 'w') as f:
    f.write(content)
