import { getSpectraPalette } from '../../../../data/utilities/generateColor.js';
import { useChartData } from '../../../context/ChartContext.js';
import type {
  PhaseCorrectionTraceData,
  TraceDirection,
} from '../../../reducer/Reducer.js';

interface UseActivePhaseTracesReturn extends PhaseCorrectionTraceData {
  activeTraceDirection: TraceDirection;
  color: string;
  addTracesToBothDirections: boolean;
}

export function useActivePhaseTraces(): UseActivePhaseTracesReturn {
  const {
    toolOptions: {
      data: {
        twoDimensionPhaseCorrection: {
          traces,
          activeTraceDirection,
          addTracesToBothDirections,
        },
      },
    },
  } = useChartData();
  const palette = getSpectraPalette();
  const color = activeTraceDirection === 'horizontal' ? palette[0] : palette[1];
  return {
    ...traces[activeTraceDirection],
    activeTraceDirection,
    color,
    addTracesToBothDirections,
  };
}
