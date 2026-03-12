import React from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export const options = {
  responsive: true,
  plugins: {
    legend: {
      position: 'top',
    },
    title: {
      display: false,
      text: 'Chart.js Line Chart',
    },
  },
  scales: {
    x: {
      title: {
        display: true,
        text: 'Month',
        color: 'black',
        fontWeight: 700,
        padding: 5
      },
      grid: {
        display: false,
      }
    },
    y: {
      title: {
        display: true,
        text: 'KG/Ton',
        color: 'black',
        fontWeight: 700,
        padding: 5
      },
      grid: {
        display: false
      }
    }
  },
};

export const data = {
 labels: ["Jan", "Feb", "Mar", "Apr","May","Jun"],
  datasets: [
    {
      label: 'CO2',
      data: [10, 30, 40, 15,23,50,90,66],
      borderColor: 'rgb(255, 99, 132)',
      backgroundColor: 'rgba(255, 99, 132, 0.5)',
    },
    // {
    //   label: 'Dataset 2',
    //   data: [15, 20, 10, 17],
    //   borderColor: 'rgb(53, 162, 235)',
    //   backgroundColor: 'rgba(53, 162, 235, 0.5)',
    // },
    // {
    //   label: 'Dataset 2',
    //   data: [10, 9, 10, 17],
    //   borderColor: 'lightblue',
    //   backgroundColor: 'rgba(53, 162, 235, 0.5)',
    // },
    // {
    //   label: 'Dataset 2',
    //   data: [12, 2, 20, 33],
    //   borderColor: 'lightgreen',
    //   backgroundColor: 'rgba(53, 162, 235, 0.5)',
    // },
  ],
};

export function LineChart(props) {
  console.log(props)
  return <Line options={props.options ? props.options : options} data={props.data?props.data:data} height={props.height}/>;
}