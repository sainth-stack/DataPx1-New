export const series1 = [
    {
        name: 'Actual',
        data: [
            {
                x: ['OEE'],
                y: 93,
                color: "#41B883",
            },
            {
                x: ['Quality'],
                y: 87,
                color: "#00D8FF",
            },
            {
                x: 'Performance',
                y: 69,
                color: "#00D8FF",
            },
            {
                x: 'Availability',
                y: 97,
                color: "#00D8FF",
            }
        ]
    }
]


export const options1 = {
    chart: {
        // height: '400px',
        // width:'100px',
        type: 'bar'
    },

    colors: [
        function ({ value, seriesIndex, dataPointIndex, w }) {
            if (value <= 50) {
                return "#d10f0f";
            } else if(value > 70) {
                return "#39c734";
            } else{
                return "#ffbf00";
            }
        }
    ],
    plotOptions: {
        bar: {
            columnWidth: '5px',
            horizontal: true,
            borderRadius: 0,
            borderRadiusApplication: 'around',
            borderRadiusWhenStacked: 'last',
            // columnWidth: '20%',
            barHeight: '40%',
            distributed: false,
            rangeBarOverlap: true,
            rangeBarGroupRows: false,
            hideZeroBarsWhenGrouped: false,
            isDumbbell: false,
            dumbbellColors: undefined,
            isFunnel: false,
            isFunnel3d: true,
        }
    },
    grid: {
        show: false
    },
    dataLabels: {
        formatter: function (val, opt) {
            const goals =
                opt.w.config.series[opt.seriesIndex].data[opt.dataPointIndex]
                    .goals

            if (goals && goals.length) {
                return `${val} / ${goals[0].value}%`
            }
            return `${val}%`
        }
    },
    xaxis: {
        labels: {
            show: false,
        }
    },
    // colors: colors
}

export const series2 = [
    {
        name: 'Actual',
        data: [
            {
                x: 'OEE',
                y: '10'
            },
            {
                x: 'Quality',
                y: 44,
            },
            {
                x: 'Performance',
                y: 54,
            },
            {
                x: 'Availability',
                y: 66,
            },

        ]
    }
]


export const options2 = {
    chart: {
        // height: '400px',
        // width:'100px',
        type: 'bar'
    },
    plotOptions: {
        bar: {
            columnWidth: '5px',
            horizontal: true,
            borderRadius: 0,
            borderRadiusApplication: 'around',
            borderRadiusWhenStacked: 'last',
            // columnWidth: '20%',
            barHeight: '40%',
            distributed: false,
            rangeBarOverlap: true,
            rangeBarGroupRows: false,
            hideZeroBarsWhenGrouped: false,
            isDumbbell: false,
            dumbbellColors: undefined,
            isFunnel: false,
            isFunnel3d: true,
        }
    },
    grid: {
        show: false
    },
    colors: ['#ADD8E6'],
    dataLabels: {
        formatter: function (val, opt) {
            const goals =
                opt.w.config.series[opt.seriesIndex].data[opt.dataPointIndex]
                    .goals

            if (goals && goals.length) {
                return `${val} / ${goals[0].value}%`
            }
            return `${val}%`
        }
    },
    xaxis: {
        labels: {
            show: false,
        }
    }
}

export const options3 = {
    chart: {
        height: 350,
        type: 'bar'
    },
    plotOptions: {
        bar: {
            columnWidth: '40%'
        }
    },
    grid: {
        show: false
    },
    colors: ['#00E396'],
    dataLabels: {
        enabled: false
    },
    legend: {
        show: true,
        showForSingleSeries: true,
        customLegendItems: ['No Of Orders'],
        markers: {
            fillColors: ['#00E396']
        }
    }
};

export const series3 = [
    {
        name: 'Actual',
        data: [
            {
                y: 20,
                x: 1,
            },
            {
                y: 60,
                x: 2,

            },
            {
                y: 80,
                x: 3,
            },
            {
                y: 46,
                x: 4,

            },
            {
                y: 76,
                x: 5,

            },
            {
                y: 56,
                x: 6,

            },
            {
                y: 26,
                x: 7,
            }
        ]
    }
]