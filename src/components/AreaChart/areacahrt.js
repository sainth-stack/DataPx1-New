import React from "react";
import Chart from 'react-apexcharts'

export default function AreaChart({options,series, width }) {

    return <div className="donut">
        <Chart options={options} series={series} width={width ? width : '160px'} />
    </div>
        ;

}


