'use client';

import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

export type HourlyWeather = {
  hour: number;
  temperature: number;
  humidity: number;
  weatherCode: number;
};

type DailyWeatherChartProps = {
  hourly: HourlyWeather[];
  showTemperature: boolean;
  showHumidity: boolean;
  showMoon: boolean;
  moonAge: number;
  moonPhase: string;
};

function weatherIconLabel(code: number): { icon: string; label: string } {
  if (code === 0) return { icon: "", label: "晴" };
  if (code <= 3) return { icon: "", label: "曇" };
  if (code <= 67) return { icon: "", label: "雨" };
  if (code <= 77) return { icon: "", label: "雪" };
  if (code <= 82) return { icon: "", label: "雨" };
  return { icon: "", label: "曇" };
}

function moonPhaseShort(age: number): string {
  if (age < 1.85) return "新月";
  if (age < 7.38) return "三日月";
  if (age < 9.22) return "上弦";
  if (age < 12.92) return "十三夜";
  if (age < 14.77) return "満月";
  if (age < 18.48) return "十六夜";
  if (age < 22.15) return "下弦";
  if (age < 25.83) return "二十六夜";
  return "新月";
}

export default function DailyWeatherChart({
  hourly,
  showTemperature,
  showHumidity,
  showMoon,
  moonAge,
  moonPhase,
}: DailyWeatherChartProps) {
  const data = hourly.map(h => {
    const w = weatherIconLabel(h.weatherCode);
    return { ...h, label: `${h.hour}`, icon: w.icon, weatherLabel: w.label };
  });

  const showChart = showTemperature || showHumidity;

  return (
    <div
      style={{
        position: 'relative',
        background: 'white',
        borderRadius: 14,
        padding: '12px 10px 8px',
        border: '1px solid rgba(60,40,20,0.1)',
      }}
    >
      {showMoon && (
        <div
          style={{
            position: 'absolute',
            top: 10,
            right: 12,
            textAlign: 'right',
            zIndex: 2,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: "bold", color: "#3d3228", lineHeight: 1 }}>{moonPhaseShort(moonAge)}</div>
          <div style={{ fontSize: 9, color: '#3d3228', opacity: 0.7, marginTop: 2 }}>
            {moonPhase}
          </div>
          <div style={{ fontSize: 9, color: '#9a8b7a' }}>月齢 {moonAge.toFixed(1)}日</div>
        </div>
      )}

      <div style={{ fontSize: 11, fontWeight: 'bold', color: '#4a6741', marginBottom: 6, paddingRight: showMoon ? 72 : 0 }}>
        今日の天気
      </div>

      {showChart && data.length > 0 && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 2, marginBottom: 6, paddingLeft: 24, paddingRight: 32 }}>
            {data.filter(h => h.hour % 3 === 0).map(h => (
              <div key={h.hour} style={{ textAlign: 'center', fontSize: 9, color: '#3d3228' }}>
                <div style={{ fontSize: 11, fontWeight: "bold" }}>{h.weatherLabel}</div>
                <div style={{ fontSize: 8, color: '#9a8b7a' }}>{h.hour}時</div>
              </div>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={120}>
            <ComposedChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="hour"
                tick={{ fontSize: 10, fill: '#9a8b7a' }}
                tickFormatter={v => `${v}`}
                interval={2}
                axisLine={{ stroke: 'rgba(60,40,20,0.15)' }}
                tickLine={false}
              />
              {showTemperature && (
                <YAxis
                  yAxisId="temp"
                  orientation="left"
                  tick={{ fontSize: 10, fill: '#c17f4a' }}
                  width={28}
                  axisLine={false}
                  tickLine={false}
                  domain={['auto', 'auto']}
                />
              )}
              {showHumidity && (
                <YAxis
                  yAxisId="humid"
                  orientation="right"
                  tick={{ fontSize: 10, fill: '#4a7a8f' }}
                  width={28}
                  axisLine={false}
                  tickLine={false}
                  domain={[0, 100]}
                />
              )}
              <Tooltip
                contentStyle={{
                  fontSize: 11,
                  borderRadius: 8,
                  border: '1px solid rgba(60,40,20,0.12)',
                }}
                formatter={(value, name) => {
                  const v = Number(value);
                  if (name === 'temperature') return [`${v}℃`, '気温'];
                  if (name === 'humidity') return [`${v}%`, '湿度'];
                  return [String(value), String(name)];
                }}
                labelFormatter={h => `${h}時`}
              />
              {showTemperature && (
                <Line
                  yAxisId="temp"
                  type="monotone"
                  dataKey="temperature"
                  stroke="#c17f4a"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 3, fill: '#c17f4a' }}
                />
              )}
              {showHumidity && (
                <Line
                  yAxisId="humid"
                  type="monotone"
                  dataKey="humidity"
                  stroke="#4a7a8f"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 3, fill: '#4a7a8f' }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 4, fontSize: 10, color: '#3d3228' }}>
            {showTemperature && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 12, height: 2, background: '#c17f4a', borderRadius: 1 }} />
                気温℃
              </span>
            )}
            {showHumidity && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 12, height: 2, background: '#4a7a8f', borderRadius: 1 }} />
                湿度%
              </span>
            )}
          </div>
        </>
      )}

      {!showChart && showMoon && (
        <div style={{ padding: '8px 0', fontSize: 11, color: '#8b7355' }}>グラフは設定で非表示です</div>
      )}
    </div>
  );
}
