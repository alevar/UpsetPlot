import * as d3 from 'd3';
import { UpsetMatrixData } from '../Home/Home';

interface Dimensions {
    width: number;
    height: number;
    x: number;
    y: number;
    fontSize: number;
}

interface UpsetPlotData {
    dimensions: Dimensions;
    upsetMatrix: UpsetMatrixData;
}

export class UpsetPlot {
    private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
    private dimensions: Dimensions;
    private upsetMatrix: UpsetMatrixData;
    private selectedIntersections: string[] = [];
    private hoveredIntersection: string | null = null;
    private onIntersectionClick: ((intersection: string) => void) | null = null;
    private tooltip!: d3.Selection<HTMLDivElement, unknown, HTMLElement, any>;

    // Component proportions - more flexible for responsiveness
    private componentRatios = {
        dot: {
            width: 0.5,
            height: 0.9
        },
        bar: {
            width: 0.45,
            height: 0.9
        },
        names: {
            width: 0.5,
            height: 0.1
        },
        spacer: 0.025
    };

    constructor(
        svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
        data: UpsetPlotData
    ) {
        this.svg = svg;
        this.dimensions = data.dimensions;
        this.upsetMatrix = data.upsetMatrix;
        this.initTooltip();
    }

    private initTooltip(): void {
        // Initialize tooltip once during construction
        if (d3.select('body').select('#upset-tooltip').empty()) {
            this.tooltip = d3.select('body')
                .append('div')
                .attr('id', 'upset-tooltip')
                .style('position', 'absolute')
                .style('opacity', '0')
                .style('background-color', 'white')
                .style('border', '1px solid #ddd')
                .style('border-radius', '4px')
                .style('padding', '8px')
                .style('pointer-events', 'none')
                .style('z-index', '1000')
                .style('box-shadow', '0 2px 5px rgba(0,0,0,0.1)');
        } else {
            this.tooltip = d3.select('#upset-tooltip');
        }
    }

    public setSelectedIntersections(intersections: string[]): void {
        this.selectedIntersections = intersections;
        this.render(); // Re-render with updated selections
    }

    public getSelectedIntersections(): string[] {
        return this.selectedIntersections;
    }

    public setOnIntersectionClick(callback: (intersection: string) => void): void {
        this.onIntersectionClick = callback;
    }

    public plot(): void {
        this.render();
    }

    private render(): void {
        // Clear the SVG for redrawing
        this.svg.selectAll("*").remove();

        // Get data from upsetMatrix
        const sets = this.upsetMatrix.getSets();
        const intersections = this.upsetMatrix.getIntersections();

        if (!sets || !intersections || sets.length === 0 || intersections.length === 0) {
            return;
        }

        // Calculate dimensions with margins to prevent clipping
        const margin = {
            top: 30,
            right: Math.max(60, this.dimensions.width * 0.1),
            bottom: 10,
            left: Math.max(70, this.dimensions.width * 0.15)
        };

        const width = this.dimensions.width - margin.left - margin.right;
        const height = this.dimensions.height - margin.top - margin.bottom;

        // Create container with margins
        const container = this.svg
            .append('g')
            .attr('transform', `translate(${margin.left}, ${margin.top})`);

        // Dynamic calculations to ensure proper fitting
        const maxLabelLength = d3.max(sets, d => d.length) || 0;
        const labelFontSize = Math.min(12, this.dimensions.fontSize,
            Math.max(8, 14 - maxLabelLength / 4));

        // Calculate section dimensions
        const label_height = Math.max(labelFontSize * 1.5, height * 0.08);
        const dot_height = height - label_height;
        const dot_width = width * this.componentRatios.dot.width;

        const spacer_width = width * this.componentRatios.spacer;

        const bar_x = dot_width + spacer_width;
        const bar_y = label_height;
        const bar_height = dot_height;
        const bar_width = width - dot_width - spacer_width - 40; // Reserve space for labels

        // Calculate cell dimensions
        const cell_width = dot_width / sets.length;
        const cell_height = Math.min(30, dot_height / intersections.length);

        // Calculate bar scales
        const maxValue = this.upsetMatrix.getMaxIntersectionValue();
        const barScale = d3.scaleLinear()
            .domain([0, maxValue])
            .range([0, bar_width]);

        // Draw dot matrix background
        container
            .append('rect')
            .attr('x', 0)
            .attr('y', label_height)
            .attr('width', dot_width)
            .attr('height', dot_height)
            .style('stroke', 'black')
            .style('stroke-width', '1px')
            .style('fill', 'none');

        // Add set labels at the top with rotation if needed
        const setLabels = container
            .selectAll('text.setLabel')
            .data(sets)
            .enter()
            .append('text')
            .attr('class', 'setLabel')
            .attr('x', (d, i) => i * cell_width + cell_width / 2)
            .attr('y', label_height - 5)
            .attr('text-anchor', 'middle')
            .attr('font-size', labelFontSize)
            .text(d => d);

        // If labels overlap, rotate them
        if (cell_width < 20 && sets.length > 5) {
            setLabels
                .attr('text-anchor', 'end')
                .attr('transform', (d, i) =>
                    `rotate(-45, ${i * cell_width + cell_width / 2}, ${label_height - 5})`)
                .attr('y', label_height - 2);
        }

        // Create a group for each intersection row
        const gridGroups = container
            .selectAll('g.gridRow')
            .data(intersections)
            .enter()
            .append('g')
            .attr('class', 'gridRow')
            .attr('transform', (d, i) => `translate(0, ${label_height + i * cell_height})`);

        // Add grid cells (backgrounds)
        gridGroups.selectAll('rect.gridCell')
            .data((d, i) => sets.map((set, j) => ({
                set,
                intersection: d,
                index: i
            })))
            .enter()
            .append('rect')
            .attr('class', 'gridCell')
            .attr('x', (d, j) => j * cell_width)
            .attr('y', 0)
            .attr('width', cell_width)
            .attr('height', cell_height)
            .style('fill', (d) => {
                const isSelected = this.selectedIntersections.includes(d.intersection.set);
                const isHovered = this.hoveredIntersection === d.intersection.set;
                return isSelected ? '#FF9806' : (isHovered ? '#FFBD62' : 'white');
            })
            .style('stroke', 'black');

        // Add circles to represent set membership
        gridGroups.selectAll('circle.gridCell')
            .data((d, i) => sets.map(set => ({
                set,
                intersection: d,
                index: i
            })))
            .enter()
            .append('circle')
            .attr('class', 'gridCell')
            .attr('cx', (d, j) => j * cell_width + cell_width / 2)
            .attr('cy', cell_height / 2)
            .attr('r', Math.min(cell_height, cell_width) / 3)
            .style('fill', (d) => {
                const isSelected = this.selectedIntersections.includes(d.intersection.set);
                const isHovered = this.hoveredIntersection === d.intersection.set;
                const isIncluded = this.upsetMatrix.isSetInIntersection(d.set, d.intersection.set);
                return isSelected
                    ? (isIncluded ? '#FF6F00' : '#807A79')
                    : (isIncluded ? (isHovered ? '#FF9C46' : '#030202') : '#807A79');
            })
            .style('stroke', 'black');

        // Draw bars with dynamic width
        container
            .selectAll('rect.valueBar')
            .data(intersections)
            .enter()
            .append('rect')
            .attr('class', 'valueBar')
            .attr('y', (d, i) => bar_y + (i * cell_height) + cell_height * 0.1)
            .attr('x', bar_x)
            .attr('width', d => barScale(d.value))
            .attr('height', cell_height * 0.8)
            .style('fill', (d) => {
                const isSelected = this.selectedIntersections.includes(d.set);
                const isHovered = this.hoveredIntersection === d.set;
                return isSelected ? '#FF6F00' : (isHovered ? '#FF9C46' : '#030202');
            });

        // Add intersection value labels
        container
            .selectAll('text.barLabel')
            .data(intersections)
            .enter()
            .append('text')
            .attr('class', 'barLabel')
            .attr('x', (d, i) => bar_x + barScale(d.value) + 5)
            .attr('y', (d, i) => bar_y + (i * cell_height) + cell_height / 2)
            .attr('dominant-baseline', 'middle')
            .attr('font-size', Math.min(10, labelFontSize * 0.8))
            .text(d => d.value)
            .each(function (d) {
                const textWidth = this.getComputedTextLength();
                if (bar_x + barScale(d.value) + textWidth + 10 > width) {
                    d3.select(this)
                        .attr('x', bar_x + barScale(d.value) - textWidth - 5)
                        .attr('text-anchor', 'end')
                        .style('fill', 'white');
                }
            });

        // Add x-axis for the bar chart
        const xAxis = d3.axisTop(
            d3.scaleLinear()
                .domain([0, maxValue])
                .range([bar_x, bar_x + bar_width])
        )
            .ticks(Math.min(5, Math.ceil(maxValue)))
            .tickFormat(d3.format(".2s"));

        container
            .append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0, ${bar_y})`)
            .call(xAxis);

        // Add intersection set labels (left side)
        container
            .selectAll('text.intersectionLabel')
            .data(intersections)
            .enter()
            .append('text')
            .attr('class', 'intersectionLabel')
            .attr('x', -5)
            .attr('y', (d, i) => label_height + (i * cell_height) + cell_height / 2)
            .attr('text-anchor', 'end')
            .attr('dominant-baseline', 'middle')
            .attr('font-size', Math.min(10, labelFontSize * 0.8))
            .text(d => {
                const maxDisplayLength = Math.floor(margin.left / (labelFontSize * 0.6)) - 2;
                return d.set.length > maxDisplayLength
                    ? d.set.substring(0, maxDisplayLength - 3) + '...'
                    : d.set;
            })
            .append('title') // Add full name as tooltip
            .text(d => d.set);

        // Add event rectangles for interactions
        container
            .selectAll('rect.eventRect')
            .data(intersections)
            .enter()
            .append('rect')
            .attr('class', 'eventRect')
            .attr('y', (d, i) => label_height + (i * cell_height))
            .attr('x', 0)
            .attr('width', width)
            .attr('height', cell_height)
            .style('fill', 'transparent')
            .on('click', (event, d) => {
                if (this.onIntersectionClick) {
                    this.onIntersectionClick(d.set);
                } else {
                    // Toggle selection
                    if (this.selectedIntersections.includes(d.set)) {
                        this.selectedIntersections = this.selectedIntersections.filter(s => s !== d.set);
                    } else {
                        this.selectedIntersections.push(d.set);
                    }
                    this.render(); // Re-render with updated selection
                }
            })
            .on('mouseover', (event, d) => {
                // Prevent infinite loop by storing the current hover state
                const previousHover = this.hoveredIntersection;
                this.hoveredIntersection = d.set;

                // Only re-render if hover state has changed
                if (previousHover !== this.hoveredIntersection) {
                    // Update appearance without full re-render
                    this.updateHighlighting();
                }

                // Show tooltip with set information
                const setNames = d.set.split(',').join(' ∩ ');

                this.tooltip
                    .html(`
                        <div class="tooltip-box">
                            <div class="tooltip-title">
                                <strong>${setNames}</strong>
                            </div>
                            <hr style="margin: 4px 0;">
                            <div class="tooltip-text">
                                <p>Count: ${d.value}</p>
                            </div>
                        </div>
                    `)
                    .style("opacity", 0.9)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY + 10) + "px");
            })
            .on('mouseleave', () => {
                // Clear hover state
                this.hoveredIntersection = null;

                // Update highlighting without full re-render
                this.updateHighlighting();

                // Hide tooltip
                this.tooltip.style("opacity", 0);
            })
            .on('mousemove', (event) => {
                // Update tooltip position
                this.tooltip
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY + 10) + "px");
            });
    }

    // Update highlighting without re-rendering the whole plot
    private updateHighlighting(): void {
        // Update grid cell backgrounds
        this.svg.selectAll('rect.gridCell')
            .style('fill', (d: any) => {
                const isSelected = this.selectedIntersections.includes(d.intersection.set);
                const isHovered = this.hoveredIntersection === d.intersection.set;
                return isSelected ? '#FF9806' : (isHovered ? '#FFBD62' : 'white');
            });

        // Update grid circles
        this.svg.selectAll('circle.gridCell')
            .style('fill', (d: any) => {
                const isSelected = this.selectedIntersections.includes(d.intersection.set);
                const isHovered = this.hoveredIntersection === d.intersection.set;
                const isIncluded = this.upsetMatrix.isSetInIntersection(d.set, d.intersection.set);
                return isSelected
                    ? (isIncluded ? '#FF6F00' : '#807A79')
                    : (isIncluded ? (isHovered ? '#FF9C46' : '#030202') : '#807A79');
            });

        // Update value bars
        this.svg.selectAll('rect.valueBar')
            .style('fill', (d: any) => {
                const isSelected = this.selectedIntersections.includes(d.set);
                const isHovered = this.hoveredIntersection === d.set;
                return isSelected ? '#FF6F00' : (isHovered ? '#FF9C46' : '#030202');
            });
    }
}