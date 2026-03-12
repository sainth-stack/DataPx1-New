import React, { useState } from "react"
import { ApexChart } from "../components/ApexBarChart"
import { RxCross2 } from 'react-icons/rx'

export const getData = (list, color) => {
    return <ul style={{ listStyle: "none" }} className='p-0 m-0 ps-1'>
        {
            list.map((item, index) => {
                return <li key={index} className='m-0 p-0' style={{ fontFamily: "poppins", fontWeight: 400, fontSize: '12px', width: '190px' }}>- {item}</li>
            })
        }
    </ul>
}

export const getTitle = (title, color, handleClosr) => {
    const handleClose = (e) => {
        e.stopPropagation();
        handleClosr()
    }
    return (
        <div className="d-flex justify-content-between">
            <h5 style={{ fontFamily: "Poppins", fontWeight: 500, fontSize: '14px', display: 'flex', alignItems: "center", padding: 0, margin: 0 }}>
                <div style={{ height: "12px", width: "12px", background: color, borderRadius: "50%", marginRight: "5px" }}></div>  {title}
            </h5>
            <RxCross2 cursor={"pointer"} color="" onClick={(e) => handleClose(e)} />
        </div>
    )
}

export const GetOdometer = (data, opt, height = 150, hoverText) => {
    const [hover, setHover] = useState(false)

    var options = {
        chart: {
            height: 350,
            type: 'radialBar',
        },
        colors: [
            function ({ value, seriesIndex, dataPointIndex, w }) {
                if (data[0] < 40) {
                    return "#d10f0f";
                } else if (data[0] > 70) {
                    return "#39c734";
                } else return "#ffbf00"
            }
        ],
        plotOptions: {
            radialBar: {
                hollow: {
                    margin: 15,
                    size: "60%"
                },
                dataLabels: {
                    showOn: "always",
                    name: {
                        offsetY: -10,
                        show: false,
                        color: "#888",
                        fontSize: "13px"
                    },
                    value: {
                        color: "#111",
                        fontSize: "20px",
                        show: true,
                        offsetY: 8,
                        offsetX: 40
                    }
                }
            }
        },
        stroke: {
            lineCap: "round",
        },
    }
    return (
        <div style={{ display: "flex", justifyContent: "start" }} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
            <ApexChart series={data} options={opt ? opt : options} type='radialBar' height={height} width={""} />
            {hover && hoverText && <div className="card" style={{ position: "absolute", padding: "10px", display: "flex", justifyContent: "center", alignItems: "center", marginTop: "20px", width: '200px', marginLeft: "-30px" }}>
                <span style={{ fontFamily: 'Inter', marginTop: '5px', fontSize: '12px', lineHeight: '14px', fontWeight: 500, textAlign: "center" }}> {hoverText}</span>
            </div>}
        </div>
    )
}

export const options3 = {
    chart: {
        type: 'bar'
    },
    colors: [
        "#faa93e",
        "#427ae3"
    ],
    plotOptions: {
        bar: {
            columnWidth: '40%',
            horizontal: false,
            borderRadius: 0,
            borderRadiusApplication: 'around',
            borderRadiusWhenStacked: 'last',
            barHeight: '50%',
            distributed: false,
            rangeBarOverlap: true,
            rangeBarGroupRows: false,
            hideZeroBarsWhenGrouped: false,
            isDumbbell: false,
            dumbbellColors: undefined,
            isFunnel: false,
            isFunnel3d: true,
            dataLabels: {
                position: 'top',
            }
        },
    },
    grid: {
        show: false
    },
    dataLabels: {
        style: {
            fontSize: '12px',
            colors: [
                "#faa93e",
                "#427ae3"
            ],        
        },
        offsetY: -20,
        formatter: function (val, opt) {
            const goals = opt.w.config.series[opt.seriesIndex].data[opt.dataPointIndex].goals
            return `${val}`
        }
    },
    yaxis: {
        title: {
            text: 'Units'
        }
    },
}

export const plantationData = (data, targetLine = false, value = "", color = "", name = "Planned") => {
    const getData = (data) => {
        const finalData = data[0].data.map((item, index) => {
            return {
                x: data[0].label[index].substring(0, 3),
                y: item,
                color: "#41B883",
            }
        })
        return finalData
    }
    const max = Math.max(...data[0].data);
    const months = data[0].data.map((item, index) => data[0].label[index].substring(0, 3))
    const finalData = [
        {
            name: name,
            data: months.map((item => {
                return targetLine ? {
                    x: item, y: value, color: color
                } : {
                    x: item, y: max
                }
            }))
        },
        {
            name: 'Actual',
            data: getData(data)
        },
    ]
    return finalData
}

export const customStyles = {
    container: provided => ({
        ...provided,
        minWidth: 250,
        maxWidth: 300,
    }),
    valueContainer: (provided, state) => ({
        ...provided,
        whiteSpace: "nowrap",
        overflow: "hidden",
        flexWrap: 'nowrap',
    }),
    menuPortal: base => ({
        ...base,
        zIndex: 99,
    }),
    menu: (base) => ({
        ...base, 
        zIndex: 999,
    }),
};

export const isSuperAdmin = () => {
    const user = JSON.parse(localStorage.getItem('user') || "{}")
    return user?.role.includes('super admin')
}

// === Simplified Amplitude Integration ===
// Since Amplitude is already initialized in index.html, we only need simple wrapper functions

/**
 * Log an event to Amplitude
 */
export async function logAmplitudeEvent(eventName, eventProps = {}) {
    try {
        if (!window.amplitude) {
            console.warn('[Amplitude] SDK not available');
            return false;
        }

        const cleanProps = {
            ...eventProps,
            timestamp: new Date().toISOString(),
            page_url: window.location.href
        };

        window.amplitude.track(eventName, cleanProps);
        console.log('[Amplitude] Event logged:', eventName, cleanProps);
        return true;

    } catch (error) {
        console.error('[Amplitude] Error logging event:', error);
        return false;
    }
}

/**
 * Set user ID
 */
export function setAmplitudeUserId(userId) {
  try {
      // More robust validation for Amplitude user ID requirements
      if (!userId || typeof userId !== 'string') {
          console.warn('[Amplitude] Not setting userId: invalid type', userId);
          return false;
      }
      
      // Trim whitespace and check length (Amplitude typically requires 5+ chars)
      const cleanUserId = userId.trim();
      if (cleanUserId.length < 5) {
          console.warn('[Amplitude] Not setting userId: too short (< 5 chars)', cleanUserId);
          return false;
      }
      
      // Check if Amplitude is available
      if (!window.amplitude) {
          console.warn('[Amplitude] SDK not available');
          return false;
      }
      console.log(cleanUserId,'cleanUserId')
      // Set the user ID
      window.amplitude.setUserId(cleanUserId);
      console.log('[Amplitude] User ID set successfully:', cleanUserId);
      return true;
      
  } catch (error) {
      console.error('[Amplitude] Error setting user ID:', error);
      return false;
  }
}

/**
 * Set user properties
 */
export function setAmplitudeUserProperties(userProperties) {
    try {
        if (window.amplitude) {
            window.amplitude.identify(userProperties);
            console.log('[Amplitude] User properties set:', userProperties);
            return true;
        }
    } catch (error) {
        console.error('[Amplitude] Error setting user properties:', error);
    }
    return false;
}