import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { QUESTION_TYPE_LABELS } from '@edumotion/domain';
import { colors } from '@edumotion/design-tokens';

function stripLatexMarkers(text) {
  return String(text || '')
    .replace(/\\\(/g, '')
    .replace(/\\\)/g, '')
    .replace(/\$\$/g, '');
}

/**
 * Native touch-friendly question renderer covering all 14 canonical question types.
 */
export function MobileQuestionCard({ question, value, onChange, disabled = false }) {
  const [simMass, setSimMass] = useState(2);
  const [simForce, setSimForce] = useState(10);
  const [simRunning, setSimRunning] = useState(false);

  if (!question) return null;
  const type = question.type === 'essay' ? 'worked_solution' : question.type;
  const interaction = question.interaction || {};

  const renderControl = () => {
    if (type === 'single_choice') {
      return (interaction.options || []).map((opt, idx) => {
        const selected = value === opt.id;
        return (
          <Pressable
            key={opt.id}
            disabled={disabled}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onChange(opt.id)}
            style={[styles.optionBtn, selected && styles.optionSelected]}
          >
            <Text style={[styles.optionLetter, selected && styles.optionLetterSelected]}>
              {String.fromCharCode(65 + idx)}
            </Text>
            <Text style={styles.optionLabel}>{stripLatexMarkers(opt.label)}</Text>
          </Pressable>
        );
      });
    }

    if (type === 'multiple_select') {
      const selectedIds = Array.isArray(value) ? value : [];
      return (interaction.options || []).map((opt) => {
        const checked = selectedIds.includes(opt.id);
        return (
          <Pressable
            key={opt.id}
            disabled={disabled}
            accessibilityRole="checkbox"
            accessibilityState={{ checked }}
            onPress={() =>
              onChange(checked ? selectedIds.filter((x) => x !== opt.id) : [...selectedIds, opt.id])
            }
            style={[styles.optionBtn, checked && styles.optionSelected]}
          >
            <Text style={[styles.optionLetter, checked && styles.optionLetterSelected]}>
              {checked ? '✓' : '□'}
            </Text>
            <Text style={styles.optionLabel}>{stripLatexMarkers(opt.label)}</Text>
          </Pressable>
        );
      });
    }

    if (type === 'true_false') {
      return [
        { val: true, label: interaction.trueLabel || 'Benar' },
        { val: false, label: interaction.falseLabel || 'Salah' }
      ].map((c) => {
        const selected = value === c.val;
        return (
          <Pressable
            key={String(c.val)}
            disabled={disabled}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onChange(c.val)}
            style={[styles.optionBtn, selected && styles.optionSelected]}
          >
            <Text style={styles.optionLabel}>{c.label}</Text>
          </Pressable>
        );
      });
    }

    if (type === 'numeric' || type === 'short_text' || type === 'formula_input') {
      return (
        <View style={styles.inputGroup}>
          <TextInput
            editable={!disabled}
            value={String(value ?? '')}
            onChangeText={onChange}
            keyboardType={type === 'numeric' ? 'decimal-pad' : 'default'}
            placeholder={interaction.placeholder || 'Masukkan jawaban...'}
            style={styles.textInput}
          />
          {interaction.unit ? <Text style={styles.unitTag}>{interaction.unit}</Text> : null}
        </View>
      );
    }

    if (type === 'fill_blank') {
      const blanks = interaction.blanks || [];
      const current = typeof value === 'object' && value !== null ? value : {};
      return (
        <View style={styles.gap8}>
          <Text style={styles.helperText}>{interaction.templateText}</Text>
          {blanks.map((b) => (
            <View key={b.id} style={styles.gap4}>
              <Text style={styles.fieldLabel}>{b.label}</Text>
              <TextInput
                editable={!disabled}
                value={current[b.id] || ''}
                onChangeText={(txt) => onChange({ ...current, [b.id]: txt })}
                placeholder={`Isi ${b.label}`}
                style={styles.textInput}
              />
            </View>
          ))}
        </View>
      );
    }

    if (type === 'matching' || type === 'drag_drop' || type === 'diagram_label') {
      const sourceItems =
        type === 'matching'
          ? interaction.leftItems || []
          : type === 'drag_drop'
            ? interaction.draggableItems || []
            : interaction.regions || [];
      const targetItems =
        type === 'matching'
          ? interaction.rightItems || []
          : type === 'drag_drop'
            ? interaction.dropZones || []
            : interaction.labelBank || [];
      const current = typeof value === 'object' && value !== null ? value : {};

      return (
        <View style={styles.gap8}>
          {sourceItems.map((src) => (
            <View key={src.id} style={styles.pairCard}>
              <Text style={styles.fieldLabel}>{src.label || src.code}</Text>
              <View style={styles.chipRow}>
                {targetItems.map((tgt) => {
                  const chosen = current[src.id] === tgt.id;
                  return (
                    <Pressable
                      key={tgt.id}
                      disabled={disabled}
                      onPress={() => onChange({ ...current, [src.id]: tgt.id })}
                      style={[styles.chip, chosen && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, chosen && styles.chipTextActive]}>{tgt.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      );
    }

    if (type === 'ordering') {
      const items = interaction.items || [];
      const order = Array.isArray(value) && value.length === items.length ? value : items.map((i) => i.id);
      const swap = (idx, delta) => {
        const tgt = idx + delta;
        if (tgt < 0 || tgt >= order.length || disabled) return;
        const next = [...order];
        [next[idx], next[tgt]] = [next[tgt], next[idx]];
        onChange(next);
      };
      return (
        <View style={styles.gap8}>
          {order.map((id, idx) => {
            const it = items.find((x) => x.id === id);
            return (
              <View key={id} style={styles.orderRow}>
                <Text style={styles.orderIdx}>{idx + 1}.</Text>
                <Text style={styles.orderLabel}>{it?.label}</Text>
                <Pressable style={styles.smallBtn} onPress={() => swap(idx, -1)}>
                  <Text style={styles.smallBtnText}>↑</Text>
                </Pressable>
                <Pressable style={styles.smallBtn} onPress={() => swap(idx, 1)}>
                  <Text style={styles.smallBtnText}>↓</Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      );
    }

    if (type === 'graph_plot') {
      const pt = value && typeof value.x === 'number' ? value : { x: 0, y: 0 };
      return (
        <View style={styles.gap8}>
          <Text style={styles.helperText}>Atur koordinat titik (x, y) secara presisi:</Text>
          <View style={styles.rowBetween}>
            <View style={styles.coordBox}>
              <Text style={styles.fieldLabel}>X: {pt.x}</Text>
              <View style={styles.chipRow}>
                <Pressable style={styles.smallBtn} onPress={() => onChange({ x: pt.x - 1, y: pt.y })}>
                  <Text style={styles.smallBtnText}>-1</Text>
                </Pressable>
                <Pressable style={styles.smallBtn} onPress={() => onChange({ x: pt.x + 1, y: pt.y })}>
                  <Text style={styles.smallBtnText}>+1</Text>
                </Pressable>
              </View>
            </View>
            <View style={styles.coordBox}>
              <Text style={styles.fieldLabel}>Y: {pt.y}</Text>
              <View style={styles.chipRow}>
                <Pressable style={styles.smallBtn} onPress={() => onChange({ x: pt.x, y: pt.y - 1 })}>
                  <Text style={styles.smallBtnText}>-1</Text>
                </Pressable>
                <Pressable style={styles.smallBtn} onPress={() => onChange({ x: pt.x, y: pt.y + 1 })}>
                  <Text style={styles.smallBtnText}>+1</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      );
    }

    if (type === 'simulation') {
      const accel = (simForce / simMass).toFixed(2);
      const obs = typeof value === 'object' && value !== null ? value.observation ?? '' : value ?? '';
      return (
        <View style={styles.gap8}>
          <View style={styles.pairCard}>
            <Text style={styles.fieldLabel}>Simulasi Hukum II Newton (a = F / m)</Text>
            <Text style={styles.helperText}>
              Massa: {simMass} kg · Gaya: {simForce} N · Percepatan: {accel} m/s² ({simRunning ? 'Berjalan' : 'Siaga'})
            </Text>
            <View style={styles.chipRow}>
              <Pressable style={styles.smallBtn} onPress={() => setSimMass((m) => Math.min(10, m + 1))}>
                <Text style={styles.smallBtnText}>m +1</Text>
              </Pressable>
              <Pressable style={styles.smallBtn} onPress={() => setSimForce((f) => Math.min(50, f + 5))}>
                <Text style={styles.smallBtnText}>F +5</Text>
              </Pressable>
              <Pressable style={styles.smallBtn} onPress={() => setSimRunning((r) => !r)}>
                <Text style={styles.smallBtnText}>{simRunning ? 'Pause' : 'Play'}</Text>
              </Pressable>
              <Pressable style={styles.smallBtn} onPress={() => { setSimMass(2); setSimForce(10); setSimRunning(false); }}>
                <Text style={styles.smallBtnText}>Reset</Text>
              </Pressable>
            </View>
          </View>
          <TextInput
            editable={!disabled}
            value={String(obs)}
            onChangeText={(txt) => onChange({ observation: txt, parameters: { mass: simMass, force: simForce } })}
            keyboardType="decimal-pad"
            placeholder="Hasil percepatan (m/s²)"
            style={styles.textInput}
          />
        </View>
      );
    }

    return (
      <TextInput
        editable={!disabled}
        multiline
        numberOfLines={4}
        value={typeof value === 'object' && value !== null ? value.text ?? '' : String(value ?? '')}
        onChangeText={(txt) => onChange({ text: txt })}
        placeholder="Tuliskan langkah penyelesaian dan alasan..."
        style={[styles.textInput, { minHeight: 96, textAlignVertical: 'top' }]}
      />
    );
  };

  return (
    <View style={styles.card}>
      <Text style={styles.typePill}>{QUESTION_TYPE_LABELS[type] || type}</Text>
      <Text style={styles.stem}>{stripLatexMarkers(question.content?.stem)}</Text>
      {question.content?.instruction ? (
        <Text style={styles.instruction}>{question.content.instruction}</Text>
      ) : null}
      <View style={styles.gap8}>{renderControl()}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface.base,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.surface.border,
    padding: 16,
    gap: 10
  },
  typePill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.blue[50],
    color: colors.blue[700],
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999
  },
  stem: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.navy[900],
    lineHeight: 22
  },
  instruction: {
    fontSize: 13,
    color: colors.text.secondary
  },
  gap8: { gap: 8 },
  gap4: { gap: 4 },
  optionBtn: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.surface.border,
    backgroundColor: colors.surface.base,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  optionSelected: {
    borderColor: colors.blue[500],
    backgroundColor: colors.blue[50]
  },
  optionLetter: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: colors.surface.subtle,
    textAlign: 'center',
    lineHeight: 30,
    fontWeight: '900',
    color: colors.text.secondary
  },
  optionLetterSelected: {
    backgroundColor: colors.blue[500],
    color: colors.surface.base
  },
  optionLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: colors.navy[900]
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  textInput: {
    flex: 1,
    minHeight: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.surface.border,
    backgroundColor: colors.surface.base,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '700',
    color: colors.navy[900]
  },
  unitTag: {
    backgroundColor: colors.surface.subtle,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    fontWeight: '900',
    color: colors.navy[900]
  },
  helperText: {
    fontSize: 12,
    color: colors.text.secondary
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.navy[900]
  },
  pairCard: {
    backgroundColor: colors.surface.muted,
    borderRadius: 12,
    padding: 10,
    gap: 6
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6
  },
  chip: {
    minHeight: 38,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.surface.border,
    backgroundColor: colors.surface.base,
    justifyContent: 'center'
  },
  chipActive: {
    borderColor: colors.brand[500],
    backgroundColor: colors.brand[50]
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.navy[900]
  },
  chipTextActive: {
    color: colors.brand[700]
  },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.surface.border,
    borderRadius: 12,
    padding: 10
  },
  orderIdx: {
    fontWeight: '900',
    color: colors.purple[700]
  },
  orderLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: colors.navy[900]
  },
  smallBtn: {
    minWidth: 40,
    minHeight: 40,
    borderRadius: 10,
    backgroundColor: colors.surface.subtle,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8
  },
  smallBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.navy[900]
  },
  rowBetween: {
    flexDirection: 'row',
    gap: 10
  },
  coordBox: {
    flex: 1,
    backgroundColor: colors.surface.muted,
    borderRadius: 12,
    padding: 10,
    gap: 6
  }
});
