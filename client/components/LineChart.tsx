import { View } from "react-native";
import Svg, { Polyline, Line, Circle, Defs, LinearGradient, Stop, Polygon } from "react-native-svg";
import { colors } from "../lib/theme";

interface Props {
  values: number[];
  color?: string;
  goal?: number;
  height?: number;
}

export default function LineChart({ values, color = colors.primary, goal, height = 150 }: Props) {
  const w = 320;
  const padY = 16;
  const chartH = height - padY * 2;

  const all = goal != null ? [...values, goal] : values;
  const min = Math.min(...all);
  const max = Math.max(...all);
  const range = max - min || 1;

  const n = values.length;
  const x = (i: number) => (n <= 1 ? w / 2 : (i / (n - 1)) * w);
  const y = (v: number) => padY + chartH - ((v - min) / range) * chartH;

  const points = values.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const areaPoints = `0,${height} ${points} ${w},${height}`;
  const goalY = goal != null ? y(goal) : null;

  return (
    <View>
      <Svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="lineArea" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="0.28" />
            <Stop offset="1" stopColor={color} stopOpacity="0.02" />
          </LinearGradient>
        </Defs>
        {goalY != null && (
          <Line x1="0" y1={goalY} x2={w} y2={goalY} stroke={colors.textFaint} strokeWidth={1} strokeDasharray="5 5" />
        )}
        <Polygon points={areaPoints} fill="url(#lineArea)" />
        <Polyline points={points} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {values.map((v, i) => (
          <Circle key={i} cx={x(i)} cy={y(v)} r={i === n - 1 ? 4 : 0} fill={color} />
        ))}
      </Svg>
    </View>
  );
}
