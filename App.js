import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './src/Screens/HomeScreen';
import AddSupplier from './src/Screens/AddSupplier';
import AddFuelType from './src/Screens/AddFuelType';
import { createTables } from './config/database';
import Ledgers from './src/Screens/Ledgers';
import AddRecordScreen from './src/Screens/AddRecordScreen';
import Accounts from './src/Screens/Accounts';
import SupplierLedgerScreen from './src/Screens/SupplierLedgerScreen';
import EditRecordScreen from './src/Screens/EditRecordScreen';

const Stack = createNativeStackNavigator();

export default function App() {

  React.useEffect(() => {
  // createTables();
}, []);


  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} options={{headerShown: false}}/>
        <Stack.Screen name="AddSupplier" component={AddSupplier} />
        <Stack.Screen name="AddFuelType" component={AddFuelType} />
        <Stack.Screen name="Ledgers" component={Ledgers} />
        <Stack.Screen name="AddRecord" component={AddRecordScreen} />
        <Stack.Screen name="EditRecord" component={EditRecordScreen} />
        <Stack.Screen name="Accounts" component={Accounts} />
        <Stack.Screen name="SupplierLedger" component={SupplierLedgerScreen} />

      </Stack.Navigator>
    </NavigationContainer>
  );
}
