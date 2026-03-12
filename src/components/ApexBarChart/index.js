import Chart from 'react-apexcharts'
// import { options } from './data'
export const ApexChart = ({series,options,height,width,type="bar"}) => {
    return (
        <Chart options={options} series={series} type={type} height={height} width={width} />
    )
}