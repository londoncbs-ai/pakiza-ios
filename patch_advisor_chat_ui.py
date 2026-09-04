import re

with open('src/app/advisor-chat/[offerId].tsx', 'r') as f:
    content = f.read()

# 1. Remove scrollToEnd from handleSend
content = content.replace("setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);", "")

# 2. Modify FlatList to be inverted
flatlist_regex = r'<FlatList\s+ref=\{flatListRef\}\s+data=\{messages\}\s+keyExtractor=\{\(m\) => m\.id\}\s+contentContainerStyle=\{\{ padding: spacing\.md, paddingBottom: spacing\.xxxl \}\}\s+renderItem=\{renderMessage\}\s+ListEmptyComponent=\{[\s\S]*?\}\s+onContentSizeChange=\{.*\}\s+onLayout=\{.*\}\s+/>'

new_flatlist = """<FlatList
          ref={flatListRef}
          inverted
          data={[...messages].reverse()}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxxl }}
          renderItem={renderMessage}
          ListEmptyComponent={
            <View style={{ transform: [{ scaleY: -1 }] }}>
              <EmptyState
                icon="chatbubbles-outline"
                title="No messages yet"
                message="Send a message to start negotiating with the advisor."
              />
            </View>
          }
        />"""

content = re.sub(flatlist_regex, new_flatlist, content)

with open('src/app/advisor-chat/[offerId].tsx', 'w') as f:
    f.write(content)
