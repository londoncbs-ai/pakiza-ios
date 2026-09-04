import re

with open('src/app/advisor-chat/[offerId].tsx', 'r') as f:
    content = f.read()

# Replace the useFocusEffect with a robust useEffect for polling
old_effect = """  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );"""

new_effect = """  useFocusEffect(
    useCallback(() => {
      load();
      const interval = setInterval(load, 3000);
      return () => clearInterval(interval);
    }, [load])
  );"""

content = content.replace(old_effect, new_effect)

with open('src/app/advisor-chat/[offerId].tsx', 'w') as f:
    f.write(content)
