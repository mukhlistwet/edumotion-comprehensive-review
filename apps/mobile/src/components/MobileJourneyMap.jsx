import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@edumotion/design-tokens';

const THEME_PALETTE = {
  adventure: { bg: '#164E3D', title: 'Adventure · Number Forest' },
  board: { bg: '#1E3A8A', title: 'Board Game · Math Quest' },
  explore: { bg: '#0F4C5C', title: 'World Exploration · Islands' },
  skill: { bg: '#4C1D95', title: 'Skill Tree · Constellation' },
  racing: { bg: '#0E596B', title: 'Racing Track · Formula Circuit' },
  galaxy: { bg: '#1E1B4B', title: 'Galaxy Mission · Orbit' }
};

export function MobileJourneyMap({ viewModel, selectedNodeId, onSelectNode }) {
  if (!viewModel) return null;
  const tplId = viewModel.template?.id || 'adventure';
  const theme = THEME_PALETTE[tplId] || THEME_PALETTE.adventure;

  return (
    <View style={[styles.worldCard, { backgroundColor: theme.bg }]}>
      <View style={styles.headerRow}>
        <Text style={styles.worldTitle}>{theme.title}</Text>
        <Text style={styles.progressTag}>
          {viewModel.progress.completedNodes}/{viewModel.progress.totalNodes} Pos
        </Text>
      </View>

      <View style={styles.nodeList}>
        {(viewModel.nodes || []).map((node) => {
          const isSelected = node.id === selectedNodeId;
          const isDone = node.status === 'completed';
          const isLocked = node.status === 'locked';
          return (
            <Pressable
              key={node.id}
              accessibilityRole="button"
              accessibilityLabel={`Checkpoint ${node.sequence}: ${node.title}, status ${node.status}`}
              onPress={() => onSelectNode(node.id)}
              style={[
                styles.nodeRow,
                isSelected && styles.nodeSelected,
                isLocked && styles.nodeLocked
              ]}
            >
              <View style={[styles.badgeCircle, isDone && styles.badgeDone]}>
                <Text style={styles.badgeText}>{isDone ? '✓' : isLocked ? '🔒' : node.sequence}</Text>
              </View>
              <View style={styles.nodeInfo}>
                <Text style={[styles.nodeTitle, isSelected && { color: colors.navy[900] }]}>
                  {node.title}
                </Text>
                <Text style={[styles.nodeMeta, isSelected && { color: colors.text.secondary }]}>
                  {node.kind} · +{node.rewardPreview?.xp || 50} XP
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  worldCard: {
    borderRadius: 20,
    padding: 16,
    gap: 12
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  worldTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900'
  },
  progressTag: {
    color: '#FFFFFF',
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 11,
    fontWeight: '800'
  },
  nodeList: { gap: 8 },
  nodeRow: {
    minHeight: 54,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 2,
    borderColor: 'transparent'
  },
  nodeSelected: {
    backgroundColor: '#FFFFFF',
    borderColor: colors.yellow[400]
  },
  nodeLocked: {
    opacity: 0.68
  },
  badgeCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.blue[500],
    alignItems: 'center',
    justifyContent: 'center'
  },
  badgeDone: {
    backgroundColor: colors.brand[500]
  },
  badgeText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 12
  },
  nodeInfo: { flex: 1 },
  nodeTitle: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14
  },
  nodeMeta: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    fontWeight: '600'
  }
});
