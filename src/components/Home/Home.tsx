import React, { useState } from "react";

import "./Home.css";

import SettingsPanel from "../SettingsPanel/SettingsPanel";
import ErrorModal from "../ErrorModal/ErrorModal";
import UpsetPlotWrapper from "../UpsetPlot/UpsetPlotWrapper";

export class UpsetMatrixData {
    private sets: Set<string> = new Set();
    private intersections: { set: string; value: number }[] = [];
    
    constructor() {
        // Initialize with empty data
    }
    
    public getSets(): string[] {
        return Array.from(this.sets);
    }
    
    public getIntersections(): { set: string; value: number }[] {
        return this.intersections;
    }
    
    public addSet(name: string): void {
        this.sets.add(name);
    }
    
    public addIntersection(set: string, value: number): void {
        this.intersections.push({ set, value });
        
        // Extract and add individual sets
        const setNames = set.split(',');
        setNames.forEach(setName => {
            this.addSet(setName);
        });
    }
    
    // Get maximum intersection value
    public getMaxIntersectionValue(): number {
        if (this.intersections.length === 0) return 0;
        return Math.max(...this.intersections.map(intersection => intersection.value));
    }
    
    // Helper method to check if a set is included in an intersection
    public isSetInIntersection(setName: string, intersection: string): boolean {
        const sets = intersection.split(',');
        return sets.includes(setName);
    }
}

export interface UpsetMatrixFile {
    data: UpsetMatrixData;
    fileName: string;
    status: 1 | 0 | -1; // valid | parsing | error
}

export function parseUpsetMatrix(upsetMatrixFileName: File): Promise<UpsetMatrixFile> {
    return new Promise((resolve, reject) => {
        const upsetMatrixFile: UpsetMatrixFile = {
            data: new UpsetMatrixData(),
            fileName: upsetMatrixFileName.name,
            status: 1, // Assume success until error occurs
        };
        
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const result = e.target?.result as string;
                const lines = result.split('\n');
                
                lines.forEach((line) => {
                    // Skip empty lines
                    if (line.trim() === '') {
                        return;
                    }
                    
                    // Skip comment lines
                    if (line.startsWith('#')) {
                        return;
                    }
                    
                    const fields = line.split('\t');
                    
                    if (fields.length === 2) {
                        const setName = fields[0].trim();
                        const value = parseInt(fields[1].trim(), 10);
                        
                        if (!isNaN(value)) {
                            upsetMatrixFile.data.addIntersection(setName, value);
                        } else {
                            console.warn(`Invalid value in line: ${line}`);
                        }
                    } else {
                        throw new Error(`Invalid line format: ${line}`);
                    }
                });
                
                resolve(upsetMatrixFile);
            } catch (error) {
                console.error("Error parsing upset matrix:", error);
                reject(new Error('Failed to parse UpsetMatrix file'));
            }
        };
        
        reader.onerror = () => {
            reject(new Error('Failed to read the file'));
        };
        
        reader.readAsText(upsetMatrixFileName);
    });
}

const Home: React.FC = () => {
    const [upsetMatrixFile, setUpsetMatrixFile] = useState<UpsetMatrixFile>({data: new UpsetMatrixData(), fileName: "", status: 0});
    const [fontSize, setFontSize] = useState<number>(16);
    const [width, setWidth] = useState<number>(500);
    const [height, setHeight] = useState<number>(500);
    const [errorModalVisible, setErrorModalVisible] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const handleUpsetMatrixFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            try {
                const upsetMatrix_data: UpsetMatrixFile = await parseUpsetMatrix(file);
                setUpsetMatrixFile({ ...upsetMatrix_data, status: 1 });
            } catch (error) {
                setUpsetMatrixFile({ ...upsetMatrixFile, status: -1 });
                setErrorMessage("Unable to parse the file. Please make sure the file is in BED format.");
                setErrorModalVisible(true);
            }
        }
    };

    const closeErrorModal = () => {
        setErrorModalVisible(false);
    };

    return (
        <div className="splicemap-plot">
            <SettingsPanel
                upsetMatrixStatus={upsetMatrixFile.status}
                onUpsetMatrixUpload={handleUpsetMatrixFileUpload}
                fontSize={fontSize}
                onFontSizeChange={setFontSize}
                width={width}
                onWidthChange={setWidth}
                height={height}
                onHeightChange={setHeight}
            />

            <div className="visualization-container">
                <UpsetPlotWrapper
                    upsetMatrixFile={upsetMatrixFile}
                    width={width}
                    height={height}
                    fontSize={fontSize}
                />
            </div>

            <ErrorModal
                visible={errorModalVisible}
                message={errorMessage}
                onClose={closeErrorModal}
            />
        </div>
    );
};

export default Home;
