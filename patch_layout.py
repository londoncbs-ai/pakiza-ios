import re

with open('src/app/(app)/_layout.tsx', 'r') as f:
    content = f.read()

# Replace Find For Me with Matches
matches_tab = """      <Tabs.Screen
        name="matches"
        options={{
          title: 'Matches',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'heart' : 'heart-outline'} size={23} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="find-for-me" options={{ href: null }} />"""

# Find the find-for-me tab and the matches hidden tab and replace them
content = re.sub(
    r'<Tabs\.Screen\s+name="find-for-me"[\s\S]*?/>\s*<Tabs\.Screen\s+name="matches"\s+options=\{\{\s*href:\s*null\s*\}\}\s*/>',
    matches_tab,
    content
)

with open('src/app/(app)/_layout.tsx', 'w') as f:
    f.write(content)
