import { useState } from 'react';
import { Box, Tabs, Tab, Paper } from '@mui/material';
import { SalaryComponentsPage } from './SalaryComponentsPage';
import { SalaryStructuresPage } from './SalaryStructuresPage';
import { SalaryAssignmentsPage } from './SalaryAssignmentsPage';
import { PayrollPeriodsPage } from './PayrollPeriodsPage';
import { GosiSettingsPage } from './GosiSettingsPage';
import { MonetizationOn, AccountTree, AssignmentInd, EventRepeat, Security } from '@mui/icons-material';

export const SalaryPage = () => {
    const [activeTab, setActiveTab] = useState(0);

    const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
        setActiveTab(newValue);
    };

    return (
        <Box>
            <Paper sx={{ mb: 3, borderRadius: 2 }}>
                <Tabs
                    value={activeTab}
                    onChange={handleTabChange}
                    indicatorColor="primary"
                    textColor="primary"
                    variant="fullWidth"
                >
                    <Tab icon={<MonetizationOn />} iconPosition="start" label="مكونات الراتب" />
                    <Tab icon={<AccountTree />} iconPosition="start" label="هياكل الرواتب" />
                    <Tab icon={<AssignmentInd />} iconPosition="start" label="تعيينات الرواتب" />
                    <Tab icon={<EventRepeat />} iconPosition="start" label="مسيرات الرواتب" />
                    <Tab icon={<Security />} iconPosition="start" label="إعدادات التأمينات" />
                </Tabs>
            </Paper>

            <Box>
                {activeTab === 0 && <SalaryComponentsPage />}
                {activeTab === 1 && <SalaryStructuresPage />}
                {activeTab === 2 && <SalaryAssignmentsPage />}
                {activeTab === 3 && <PayrollPeriodsPage />}
                {activeTab === 4 && <GosiSettingsPage />}
            </Box>
        </Box>
    );
};

export default SalaryPage;
