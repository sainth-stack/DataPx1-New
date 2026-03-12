import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from "chart.js";
import { Bar } from "react-chartjs-2";
// import faker from "faker";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export const options = {
  responsive: true,
  interaction: {
    mode: 'index',
    intersect: false,
  },
  plugins: {
    legend: {
      display: false,
    },
    title: {
      display: true,
      // text: 'Chart.js Horizontal Bar Chart',
    },
  },
  tooltip: {
    enabled: false,
    position: 'nearest',
    external: externalTooltipHandler
  },
  scales: {
    x: {
      title: {
        display: true,
        text: 'Month',
        color:'black',
        fontWeight:700,
        padding:5
      },
      grid: {
        display: false,
      }
    },
    y: {
      title: {
        display: true,
        text: 'Temperature',
        color:'black',
        fontWeight:700,
        padding:5
      },
      grid: {
        display: false
      }
    }
  }
};

const labels = ["Jan 30,2023", "Feb 6,2023", "Feb 16,2023", "Feb 30,2023", "Mar 16,2023","Mar 16,2023"];

export const data = {
  labels,
  datasets: [
    {
      label: "Dataset 1",
      data: [5,8],
      backgroundColor: "tomato",
      stack: "Stack 0"
    },
    {
      label: "Dataset 2",
      data: [3,2],
      backgroundColor: "lightgreen",
      stack: "Stack 0"
    },
  ]
};

export default function StackChart() {
  return <Bar options={options} data={data} style={{height:'300px'}}/>;
}
