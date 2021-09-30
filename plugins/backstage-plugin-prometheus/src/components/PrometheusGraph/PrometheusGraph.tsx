/*
 * Copyright 2021 Larder Software Limited
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React from 'react';
import { DateTime } from 'luxon';
import { Box, useTheme } from '@material-ui/core';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';

// @ts-ignore no types
import useDimensions from 'react-use-dimensions';
import { InfoCard, Progress } from '@backstage/core-components';
import Alert from '@material-ui/lab/Alert';
import { BackstagePalette } from '@backstage/theme';
import { CustomTooltip, tooltipCollector } from '../CustomTooltip';
import { useMetrics } from '../../hooks/usePrometheus';

const strokeColors = [
  '#8884d8',
  '#82ca9d',
  '#e74a3b',
  '#d873ea',
  '#eac473',
  '#0b4ff8',
  '#73ea79',
  '#681577',
  '#00ffb0',
  '#ff0000',
];

type PrometheusTheme = {
  palette: BackstagePalette;
};

type GraphProps = {
  keys: string[];
  metrics: { [k: string]: any };
  data: ReadonlyArray<{}>;
};

const useStyles = (theme: PrometheusTheme) => ({
  axis: {
    fill: theme.palette.text.primary,
  },
  container: {
    height: 450,
    width: 1200,
  },
  cartesianGrid: {
    stroke: theme.palette.textVerySubtle,
  },
  chart: {
    margin: {
      right: 30,
      top: 16,
    },
  },
  yAxis: {
    width: 75,
  },
});

const CustomizedTick = ({ x, y, payload, collector }: any) => {
  const formatter = new Intl.NumberFormat('en', {
    notation: 'compact',
  });
  collector.collect(payload.value, y);
  return (
    <g>
      <text x={x} y={y} fill="#5d6571" textAnchor="end" dy={16}>
        {formatter.format(payload.value)}
      </text>
    </g>
  );
};

const AreaGraph = ({ data, keys, metrics }: GraphProps) => {
  const collector = tooltipCollector();

  const [chartRef] = useDimensions(); // [chartRef, { x, y, width, height }]
  const theme = useTheme<PrometheusTheme>();
  const styles = useStyles(theme);

  // ref not part of type definitions on Box, hence hacking it in
  return (
    <Box display="flex" flexDirection="column" {...({ ref: chartRef } as any)}>
      <ResponsiveContainer
        width="95%"
        height={styles.container.height}
        className="cost-overview-chart"
      >
        <AreaChart data={data}>
          <defs>
            {keys.map((key, idx) => (
              <linearGradient
                key={key}
                id={`color${key}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor={strokeColors[idx % 10]}
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor={strokeColors[idx % 10]}
                  stopOpacity={0}
                />
              </linearGradient>
            ))}
          </defs>
          <XAxis
            dataKey="time"
            domain={['dataMin', 'dataMax']}
            tickFormatter={timeStr =>
              DateTime.fromSeconds(timeStr).toFormat('HH:MM:ss')
            }
            tickCount={6}
            type="number"
            stroke={styles.axis.fill}
          />
          <YAxis tick={<CustomizedTick collector={collector} />} />
          <RechartsTooltip
            content={<CustomTooltip collector={collector} metrics={metrics} />}
          />
          {keys.map((key, idx) => (
            <Area
              key={key}
              isAnimationActive={false}
              type="monotone"
              dataKey={key}
              stroke={strokeColors[idx % 10]}
              fillOpacity={1}
              strokeWidth={2}
              fill={`url(#color${key})`}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </Box>
  );
};

export const LineGraph = ({ data, keys, metrics }: GraphProps) => {
  const collector = tooltipCollector();

  const [chartRef] = useDimensions(); // [chartRef, { x, y, width, height }]

  const theme = useTheme<PrometheusTheme>();
  const styles = useStyles(theme);

  // ref not part of type definitions on Box, hence hacking it in
  return (
    <Box display="flex" flexDirection="column" {...({ ref: chartRef } as any)}>
      <ResponsiveContainer
        width="95%"
        height={styles.container.height}
        className="cost-overview-chart"
      >
        <ComposedChart margin={styles.chart.margin} data={data}>
          <CartesianGrid stroke={styles.cartesianGrid.stroke} />
          <XAxis
            dataKey="time"
            domain={['dataMin', 'dataMax']}
            tickFormatter={timeStr =>
              DateTime.fromSeconds(timeStr).toFormat('HH:MM:ss')
            }
            tickCount={6}
            type="number"
            stroke={styles.axis.fill}
          />
          <YAxis tick={<CustomizedTick collector={collector} />} />
          <RechartsTooltip
            content={<CustomTooltip collector={collector} metrics={metrics} />}
          />
          <Legend />
          {keys.map((key, idx) => (
            <Line
              dot={false}
              isAnimationActive={false}
              label={false}
              key={key}
              strokeWidth={2}
              dataKey={key}
              stroke={strokeColors[idx % 10]}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </Box>
  );
};

export const PrometheusGraph = ({
  query = `up`,
  range = { hours: 1 },
  step = 14,
  dimension,
  graphType = 'line',
}: {
  query: string;
  range: {
    hours?: number;
    minutes?: number;
  };
  step?: number;
  dimension?: string;
  graphType?: 'line' | 'area';
}) => {
  const { data, keys, metrics, loading, error } = useMetrics({
    query,
    range,
    step,
    dimension,
  });

  if (loading) {
    return <Progress />;
  } else if (error) {
    return <Alert severity="error">{error.message}</Alert>;
  }

  return graphType === 'line' ? (
    <InfoCard title={query}>
      <LineGraph data={data} keys={keys} metrics={metrics} />
    </InfoCard>
  ) : (
    <InfoCard title={query}>
      {' '}
      <AreaGraph data={data} keys={keys} metrics={metrics} />
    </InfoCard>
  );
};
