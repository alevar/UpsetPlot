import React, { useState } from "react";
import { Card, Form, OverlayTrigger, Tooltip } from "react-bootstrap";
import { InfoCircle } from "react-bootstrap-icons";
import "./SettingsPanel.css";

interface SettingsPanelProps {
    upsetMatrixStatus: number;
    onUpsetMatrixUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
    fontSize: number;
    onFontSizeChange: (value: number) => void;
    width: number;
    onWidthChange: (value: number) => void;
    height: number;
    onHeightChange: (value: number) => void;
    sortBy: 'input' | 'count';
    onSortByChange: (value: 'input' | 'count') => void;
    hideEmpty: boolean;
    onHideEmptyChange: (value: boolean) => void;
    availableSets: string[];
    selectedSets: string[];
    onSelectedSetsChange: (sets: string[]) => void;
    onCopyLink: () => void;
    copyToast: boolean;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
    upsetMatrixStatus,
    onUpsetMatrixUpload,
    fontSize,
    onFontSizeChange,
    width,
    onWidthChange,
    height,
    onHeightChange,
    sortBy,
    onSortByChange,
    hideEmpty,
    onHideEmptyChange,
    availableSets,
    selectedSets,
    onSelectedSetsChange,
    onCopyLink,
    copyToast,
}) => {
    // Help tooltip content for each file type
    const tooltips = {
        upset_matrix: (
            <Tooltip id="upsetMatrix-tooltip" className="tooltip-hover">
                <strong>Upset Matrix File Example (CSV):</strong>
                <pre style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
                       {'SetA,SetB,count\n'+
                        'True,False,120\n'+
                        'False,True,150\n'+
                        'True,True,45\n'}
                </pre>
                <div>File containing the matrix to generate the upset plot.</div>
            </Tooltip>
        ),
    };

    // Helper component for upload fields with help tooltip that stays visible on hover
    const UploadFieldWithHelp = ({
        id,
        label,
        onChange,
        errorStatus,
        errorMessage,
        tooltipContent
    }: {
        id: string;
        label: string;
        onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
        errorStatus?: number;
        errorMessage?: string;
        tooltipContent: JSX.Element;
    }) => {
        const [show, setShow] = useState(false);

        return (
            <Form.Group controlId={id} className="mb-3">
                <OverlayTrigger
                    placement="right"
                    show={show}
                    onToggle={setShow}
                    trigger={["click"]}
                    rootClose
                    rootCloseEvent="mousedown"
                    overlay={tooltipContent}
                >
                    <span
                        className="ms-2"
                        style={{ cursor: 'help' }}
                        onClick={() => setShow(!show)} // Toggle on click too
                    >
                        <InfoCircle size={16} />
                    </span>
                </OverlayTrigger>
                <Form.Label className="d-flex align-items-center">
                    {label}
                </Form.Label>
                <Form.Control type="file" accept=".csv" onChange={onChange} />
                {errorStatus === -1 && (
                    <div className="text-danger">{errorMessage}</div>
                )}
            </Form.Group>
        );
    };

    return (
        <div className="settings-panel">
            <Card className="settings-card">
                <Card.Body className="settings-body">
                    <Card.Title className="settings-title">Settings</Card.Title>
                    <Form>
                        <UploadFieldWithHelp
                            id="upsetMatrixUpload"
                            label="Upset Matrix"
                            onChange={onUpsetMatrixUpload}
                            errorStatus={upsetMatrixStatus}
                            errorMessage="Error parsing upset matrix file"
                            tooltipContent={tooltips.upset_matrix}
                        />

                        <Form.Group controlId="fontSize" className="mb-3">
                            <Form.Label>Font Size</Form.Label>
                            <Form.Control
                                type="number"
                                value={fontSize}
                                onChange={(e) => onFontSizeChange(Number(e.target.value))}
                            />
                        </Form.Group>

                        <Form.Group controlId="width" className="mb-3">
                            <Form.Label>Width</Form.Label>
                            <Form.Control
                                type="number"
                                value={width}
                                onChange={(e) => onWidthChange(Number(e.target.value))}
                            />
                        </Form.Group>

                        <Form.Group controlId="height" className="mb-3">
                            <Form.Label>Height</Form.Label>
                            <Form.Control
                                type="number"
                                value={height}
                                onChange={(e) => onHeightChange(Number(e.target.value))}
                            />
                        </Form.Group>

                        <Form.Group controlId="sortBy" className="mb-3">
                            <Form.Label>Sort By</Form.Label>
                            <Form.Select value={sortBy} onChange={(e) => onSortByChange(e.target.value as any)}>
                                <option value="input">Input Order</option>
                                <option value="count">Count (Frequency)</option>
                            </Form.Select>
                        </Form.Group>

                        <Form.Group controlId="hideEmpty" className="mb-3">
                            <Form.Check 
                                type="switch"
                                label="Hide Empty Intersections"
                                checked={hideEmpty}
                                onChange={(e) => onHideEmptyChange(e.target.checked)}
                            />
                        </Form.Group>

                        <Form.Group controlId="subsetSelection" className="mb-3">
                            <Form.Label>Select Sets</Form.Label>
                            {availableSets.length > 0 ? (
                                <div className="set-checkbox-container" style={{maxHeight: '150px', overflowY: 'auto', border: '1px solid var(--bs-border-color)', padding: '10px', borderRadius: '4px'}}>
                                    {availableSets.map((set) => (
                                        <Form.Check
                                            key={set}
                                            type="checkbox"
                                            id={`set-checkbox-${set}`}
                                            label={set}
                                            checked={selectedSets.includes(set)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    onSelectedSetsChange([...selectedSets, set]);
                                                } else {
                                                    onSelectedSetsChange(selectedSets.filter(s => s !== set));
                                                }
                                            }}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="text-muted small">No sets available</div>
                            )}
                        </Form.Group>
                        <Form.Group className="mb-0 mt-2">
                            <button
                                type="button"
                                className="copy-link-btn"
                                onClick={onCopyLink}
                            >
                                {copyToast ? (
                                    <span className="copy-link-copied">✓ Copied!</span>
                                ) : (
                                    <span>🔗 Copy Link</span>
                                )}
                            </button>
                        </Form.Group>
                    </Form>
                </Card.Body>
            </Card>
        </div>
    );
};

export default SettingsPanel;