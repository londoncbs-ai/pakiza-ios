import re

with open('src/app/advisor-chat/[offerId].tsx', 'r') as f:
    content = f.read()

# Replace the proposalActions block to depend on offer status
old_actions = """              <View style={styles.proposalActions}>
                <Button 
                  label="Negotiate" 
                  variant="secondary" 
                  style={{ flex: 1, marginRight: spacing.sm }}
                  onPress={() => {
                    // Pre-fill input for negotiation or handle negotiate flow
                    setInputText("I'd like to negotiate this proposal: ");
                  }} 
                />
                <Button 
                  label="Accept" 
                  variant="primary" 
                  style={{ flex: 1 }}
                  onPress={() => {
                    // In a real app, you'd show a confirmation or payment sheet
                    matchAdvisorsApi.acceptOffer(offerId).then(() => {
                      load();
                    }).catch(err => console.error(err));
                  }} 
                />
              </View>"""

new_actions = """              {offer?.status === 'OPEN' ? (
                <View style={styles.proposalActions}>
                  <Button 
                    label="Negotiate" 
                    variant="secondary" 
                    style={{ flex: 1, marginRight: spacing.sm }}
                    onPress={() => {
                      setInputText("I'd like to negotiate this proposal: ");
                    }} 
                  />
                  <Button 
                    label="Accept" 
                    variant="primary" 
                    style={{ flex: 1 }}
                    onPress={() => {
                      matchAdvisorsApi.acceptOffer(offerId).then(() => {
                        load();
                      }).catch(err => console.error(err));
                    }} 
                  />
                </View>
              ) : (
                <View style={[styles.proposalActions, { justifyContent: 'center', marginTop: spacing.sm }]}>
                  <View style={{ backgroundColor: offer?.status === 'ACCEPTED' ? palette.success : palette.muted, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12 }}>
                    <Text variant="label" style={{ color: 'white' }}>{offer?.status || 'CLOSED'}</Text>
                  </View>
                </View>
              )}"""

content = content.replace(old_actions, new_actions)

with open('src/app/advisor-chat/[offerId].tsx', 'w') as f:
    f.write(content)
