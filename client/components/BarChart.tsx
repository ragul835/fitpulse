import { View, Text } from "react-native";
import Svg, { Rect, LinearGradient, Stop, Defs } from "react-native-svg";
import { colors } from "../lib/theme";

interface Props {
  data: { label: string; value: number }[];
  color?: string;
  height?: number;
  formatValue?: (n: number) => string;
}

export default function BarChart({ data, color = colors.primary, height = 150, formatValue }: Props) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const barGap = 10;
  const n = data.length || 1;
  // Use a viewBox so it scales to container width on all platforms.
  const vbWidth = 320;
  const barW = (vbWidth - barGap * (n - 1)) / n;
  const chartH = height - 26;
  const todayIdx = data.length - 1;

  return (
    <View>
      <Svg width="100%" height={height} viewBox={`0 0 ${vbWidth} ${height}`} preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="1" />
            <Stop offset="1" stopColor={color} stopOpacity="0.35" />
          </LinearGradient>
        </Defs>
        {data.map((d, i) => {
          const h = Math.max(3, (d.value / max) * chartH);
          const x = i * (barW + barGap);
          const y = chartH - h;
          return (
            <Rect
              key={i}
              x={x}
              y={y}
              width={barW}
              height={h}
              rx={5}
              fill={i === todayIdx ? "url(#barGrad)" : color}
              opacity={i === todayIdx ? 1 : 0.5}
            />
          );
        })}
      </Svg>
      <View style={{ flexDirection: "row", marginTop: 6 }}>
        {data.map((d, i) => (
          <View key={i} style={{ flex: 1, alignItems: "center" }}>
            <Text style={{ color: i === todayIdx ? colors.text : colors.textFaint, fontSize: 11, fontWeight: i === todayIdx ? "700" : "500" }}>
              {d.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
