import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import { TrapStep } from '../../types/trap';
import { StepBlock } from './StepBlock';

interface Props {
  steps: TrapStep[];
  onReorder: (steps: TrapStep[]) => void;
  onEdit: (stepId: string) => void;
  onDelete: (stepId: string) => void;
}

export function DragCanvas({ steps, onReorder, onEdit, onDelete }: Props) {
  function renderItem({ item, getIndex, drag, isActive }: RenderItemParams<TrapStep>) {
    return (
      <StepBlock
        step={item}
        index={getIndex() ?? 0}
        drag={drag}
        isActive={isActive}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    );
  }

  return (
    <DraggableFlatList
      data={steps}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      onDragEnd={({ data }) => onReorder(data)}
      contentContainerStyle={{ paddingVertical: 8 }}
    />
  );
}
