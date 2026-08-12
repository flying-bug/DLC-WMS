import React from 'react';
import Select from 'react-select';

export default function SearchableSelect({ children, value, onChange, name, className, disabled, style, id }) {
    // Parse children to extract value and label
    const options = [];
    React.Children.toArray(children).forEach(child => {
        if (child && child.type === 'option') {
            options.push({
                value: child.props.value !== undefined ? child.props.value : child.props.children,
                label: child.props.children,
                isDisabled: child.props.disabled
            });
        } else if (child && child.type === React.Fragment) {
            React.Children.toArray(child.props.children).forEach(grandchild => {
                if (grandchild && grandchild.type === 'option') {
                    options.push({
                        value: grandchild.props.value !== undefined ? grandchild.props.value : grandchild.props.children,
                        label: grandchild.props.children,
                        isDisabled: grandchild.props.disabled
                    });
                }
            });
        }
    });

    const selectedOption = options.find(opt => String(opt.value) === String(value)) || null;

    const handleChange = (selected) => {
        if (onChange) {
            // Mock event object for native onChange compatibility
            const mockEvent = {
                target: {
                    name: name,
                    value: selected ? selected.value : ''
                }
            };
            onChange(mockEvent);
        }
    };

    const { padding, height, minHeight, ...cleanStyle } = style || {};

    return (
        <Select
            id={id}
            isDisabled={disabled}
            options={options}
            value={selectedOption}
            onChange={handleChange}
            maxMenuHeight={175} // Giới hạn hiển thị 5 item (mỗi item ~35px)
            isSearchable={true}
            placeholder="Chọn..."
            isClearable={false}
            classNamePrefix="react-select"
            menuPortalTarget={document.body}
            styles={{
                control: (base) => ({
                    ...base,
                    minHeight: '32px',
                    borderColor: '#d1d5db',
                    flexWrap: 'nowrap',
                    ...cleanStyle
                }),
                valueContainer: (base) => ({
                    ...base,
                    padding: '0 8px',
                }),
                dropdownIndicator: (base) => ({
                    ...base,
                    padding: '4px',
                }),
                indicatorSeparator: () => ({
                    display: 'none',
                }),
                menuPortal: (base) => ({
                    ...base,
                    zIndex: 9999
                }),
                menu: (base) => ({
                    ...base,
                    zIndex: 9999
                })
            }}
        />
    );
}
