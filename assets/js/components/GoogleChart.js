/**
 * GoogleChart component.
 *
 * Site Kit by Google, Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * External dependencies
 */
import debounce from 'lodash/debounce';
import { until } from 'wait-promise';

/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { useEffect, useState, useRef } from '@wordpress/element';

/**
 * Internal dependencies
 */
import ProgressBar from './ProgressBar';

// Use a global variable to prevent separate webpack bundles from loading the
// script multiples times.
if ( global.googlesitekit === undefined ) {
	global.googlesitekit = {};
}

global.googlesitekit.__hasLoadedGoogleCharts = false;

async function loadCharts() {
	if ( global.googlesitekit.__chartLoadPromise ) {
		return global.googlesitekit.__chartLoadPromise;
	}

	// Inject the script if not already loaded and resolve on load.
	if ( ! global.google || ! global.google.charts ) {
		const script = document.createElement( 'script' );
		script.type = 'text/javascript';

		// Only insert the DOM element if no Charts loader script is detected.
		if ( document.querySelectorAll( 'script[src="https://www.gstatic.com/charts/loader.js"]' ).length === 0 ) {
			global.googlesitekit.__chartLoadPromise = new Promise( ( resolve ) => {
				script.onload = resolve;
				// Add the script to the DOM
				global.document.head.appendChild( script );
				// Set the `src` to begin transport
				script.src = 'https://www.gstatic.com/charts/loader.js';
			} );
		}
	} else {
		// Charts is already available - resolve immediately.
		global.googlesitekit.__chartLoadPromise = Promise.resolve();
	}

	return global.googlesitekit.__chartLoadPromise;
}

export default function GoogleChart( props ) {
	const {
		chartType,
		className,
		data,
		loadCompressed,
		loadHeight,
		loadSmall,
		loadText,
		options,
		selectedStats,
		singleStat,
	} = props;

	const chartRef = useRef( null );
	const [ chart, setChart ] = useState( null );
	const [ loading, setLoading ] = useState( true );
	const [ visualizationLoaded, setVisualizationLoaded ] = useState( false );

	// Load the google charts library.
	useEffect( () => {
		( async () => {
			await loadCharts();

			// Only call `charts.load` if the charts haven't been loaded yet.
			if ( ! global.googlesitekit.__hasLoadedGoogleCharts && global.google?.charts ) {
				global.googlesitekit.__hasLoadedGoogleCharts = true;
				global.google.charts.load( 'current', {
					packages: [ 'corechart' ],
					callback: () => {
						setLoading( false );
					},
				} );
			}
		} )();
	}, [] );

	// Create a new chart when the library is loaded.
	useEffect( () => {
		if ( ! loading && chartRef?.current && visualizationLoaded ) {
			const googleChart = 'pie' === chartType
				? new global.google.visualization.PieChart( chartRef.current )
				: new global.google.visualization.LineChart( chartRef.current );

			setChart( googleChart );
		}
	}, [ loading, !! chartRef.current, chartType, visualizationLoaded ] );
	// } );

	// Draw the chart whenever one of these properties has changed.
	useEffect( () => {
		const drawChart = () => {
			let dataTable = global.google?.visualization?.arrayToDataTable?.( data );
			if ( ! dataTable ) {
				return;
			}

			if ( selectedStats.length > 0 ) {
				const dataView = new global.google.visualization.DataView( dataTable );
				if ( ! singleStat ) {
					dataView.setColumns(
						[ 0, ...selectedStats.map( ( stat ) => stat + 1 ) ]
					);
				}
				dataTable = dataView;
			}

			if ( chart ) {
				chart.draw( dataTable, options );
			}
		};

		const resize = debounce( drawChart, 100 );
		global.addEventListener( 'resize', resize );

		drawChart();

		return () => {
			global.removeEventListener( 'resize', resize );
		};
	}, [
		chart,
		data,
		selectedStats,
		options,
		singleStat,
	] );

	useEffect( () => {
		( async () => {
			await until( () => {
				return (
					!! global.google?.visualization &&
					!! global.google?.visualization?.PieChart &&
					!! global.google?.visualization?.LineChart
				);
			} );

			setLoading( false );
			setVisualizationLoaded( true );
		} )();
	}, [] );

	return (
		<div className="googlesitekit-graph-wrapper">
			<div ref={ chartRef } className="googlesitekit-line-chart">
				<div className="googlesitekit-chart-loading">
					{ loading && (
						<div className="googlesitekit-chart-loading__wrapper">
							{ loadText && (
								<p>{ __( 'Loading chart…', 'google-site-kit' ) }</p>
							) }

							<ProgressBar
								className={ className }
								small={ loadSmall }
								compress={ loadCompressed }
								height={ loadHeight }
							/>
						</div>
					) }
				</div>
			</div>
		</div>
	);
}

GoogleChart.defaultProps = {
	chartType: 'line',
	className: '',
	data: [],
	loadCompressed: false,
	loadSmall: false,
	loadHeight: null,
	loadText: true,
	selectedStats: [],
	singleStat: true,
};
