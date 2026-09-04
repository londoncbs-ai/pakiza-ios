import re

with open('src/app/(app)/advisors.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    "onPress={() => router.push(`/(app)/requests/${item.id}` as any)}",
    "/* request management handled here or via edit */"
)

with open('src/app/(app)/advisors.tsx', 'w') as f:
    f.write(content)
