import { WorkloadSpec, hoursPerMonth } from '../common'
import _ from 'lodash'

export enum MODE {
    CQL = 'CQL',
    LWT = 'LWT',
    NoLWT = 'NoLWT'
}

export interface PerfModeData {
    reads: number
    writes: number
}

const vcpuPerf: Record<MODE, PerfModeData> = {
    [MODE.CQL]: {
        reads: 15000,
        writes: 15000
    },
    [MODE.LWT]: {
        writes: 1200,
        reads: 4000
    },
    [MODE.NoLWT]: {
        writes: 6000,
        reads: 4000
    }
}

const AWSDataTransferPrice = 0.01 // GB/month
const DataThroughputAvgFactor = 0.33
const CompactionOverhead = 1.4 // ICS
const RAMtoDiskRatio = 100
const RAMtoDataRatio = 75 // ICS

const LicenseCorePriceYearly = {
    onDemand: 750 as YearlyPrice,
    reserved: 495 as YearlyPrice
}

interface ResourceSpec {
    readonly vcpu: number
    readonly memory: number
    readonly storage: number
}

interface ClusterSpec {
    readonly nodes: number
    readonly instanceType: InstanceTypeSpec
}

interface NodePricing {
    readonly reserved: MonthlyPrice
    readonly ondemand: MonthlyPrice 
}

type HourlyPrice = number
type MonthlyPrice = number
type YearlyPrice = number

interface InstanceTypeSpec extends ResourceSpec {
    readonly name: string
    readonly computePrice: NodePricing
}

type Cloud = 'aws' | 'gcp'

type InstanceTypesSpec = {
    [cloud in Cloud]: InstanceTypeSpec[]
}

const instanceTypes: InstanceTypesSpec = {
    gcp: [
        {
            name: 'n2-highmem-2',
            vcpu: 2,
            memory: 16,
            storage: 375,
            computePrice: {
                ondemand: 159.39,
                reserved: 124
            }
        },
        {
            name: 'n2-highmem-4',
            vcpu: 4,
            memory: 32,
            storage: 750,
            computePrice: {
                ondemand: 318.78,
                reserved: 248
            }
        },
        {
            name: 'n2-highmem-8',
            vcpu: 8,
            memory: 64,
            storage: 1500,
            computePrice: {
                ondemand: 637.56,
                reserved: 496
            }
        },
        {
            name: 'n2-highmem-16',
            vcpu: 16,
            memory: 128,
            storage: 3000,
            computePrice: {
                ondemand: 1275.12,
                reserved: 992
            }
        },
        {
            name: 'n2-highmem-32',
            vcpu: 32,
            memory: 256,
            storage: 7500,
            computePrice: {
                ondemand: 2805.24,
                reserved: 2238.99
            }
        },
        {
            name: 'n2-highmem-48',
            vcpu: 64,
            memory: 384,
            storage: 9000,
            computePrice: {
                ondemand: 3825.37,
                reserved: 2976
            }
        },
        {
            name: 'n2-highmem-64',
            vcpu: 64,
            memory: 512,
            storage: 9000,
            computePrice: {
                ondemand: 4590.49,
                reserved: 3458
            }
        }
    ],
    aws: [
        {
            name: 'i3.large',
            vcpu: 2,
            memory: 15.25,
            storage: 475,
            computePrice: {
                ondemand: 113.88,
                reserved: 72.5
            },
        },
        {
            name: 'i3.xlarge',
            vcpu: 4,
            memory: 30.5,
            storage: 950,
            computePrice: {
                ondemand: 227.76,
                reserved: 145.08
            }
        },
        {
            name: 'i3.2xlarge',
            vcpu: 8,
            memory: 61,
            storage: 1900,
            computePrice: {
                ondemand: 455.52,
                reserved: 290.17
            }
        },
        {
            name: 'i3.4xlarge',
            vcpu: 16,
            memory: 122,
            storage: 3800,
            computePrice: {
                ondemand: 911.04,
                reserved: 580.33
            }
        },
        {
            name: 'i3.8xlarge',
            vcpu: 32,
            memory: 244,
            storage: 7600,
            computePrice: {
                ondemand: 1822.08,
                reserved: 1160.67
            }
        },
        {
            name: 'i3.16xlarge',
            vcpu: 64,
            memory: 488,
            storage: 15200,
            computePrice: {
                ondemand: 3644.16,
                reserved: 2321.33
            }
        },
        {
            name: 'i3en.large',
            vcpu: 2,
            memory: 16,
            storage: 1250,
            computePrice: {
                ondemand: 164.98,
                reserved: 104.83
            }
        },
        {
            name: 'i3en.xlarge',
            vcpu: 4,
            memory: 32,
            storage: 2500,
            computePrice: {
                ondemand: 329.96,
                reserved: 209.75
            }
        },
        {
            name: 'i3en.2xlarge',
            vcpu: 8,
            memory: 64,
            storage: 5000,
            computePrice: {
                ondemand: 659.92,
                reserved: 419.50
            }
        },
        {
            name: 'i3en.3xlarge',
            vcpu: 12,
            memory: 96,
            storage: 7500,
            computePrice: {
                ondemand: 989.88,
                reserved: 629.25
            }
        },
        {
            name: 'i3en.6xlarge',
            vcpu: 24,
            memory: 192,
            storage: 15000,
            computePrice: {
                ondemand: 1979.76,
                reserved: 1258.42
            }
        },
        {
            name: 'i3en.12xlarge',
            vcpu: 48,
            memory: 384,
            storage: 30000,
            computePrice: {
                ondemand: 3959.52, 
                reserved: 2516.83
            }
        },
        {
            name: 'i3en.24xlarge',
            vcpu: 96,
            memory: 768,
            storage: 60000,
            computePrice: {
                ondemand: 7919.04,
                reserved: 5033.75
            }
        }
    ]
}

function licensePrice(cluster: ClusterSpec, licensePriceCore: number): MonthlyPrice {
    return cluster.instanceType.vcpu * cluster.nodes * licensePriceCore / 12
}

function ondemandPrice(cluster: ClusterSpec): MonthlyPrice {
    return cluster.nodes * cluster.instanceType.computePrice.ondemand
}

function reservedPrice(cluster: ClusterSpec): MonthlyPrice {
    return cluster.nodes * cluster.instanceType.computePrice.reserved
}

function clusterResources(cluster: ClusterSpec): ResourceSpec {
    return {
        storage: cluster.instanceType.storage * cluster.nodes,
        vcpu: cluster.instanceType.vcpu * cluster.nodes,
        memory: cluster.instanceType.memory * cluster.nodes
    }
}


/*
The following is experimental result, function is based on model regressions done on a series of benchmark results. itemSize in kb.
*/
function itemSizePerfFactor(itemSize: number): number {
    const a = 4.81
    const b = 3.764
    return a / (itemSize + b)
}

/* Cluster size recommendations based on the optimization target:
- performance (CPU) - select nodes with enough storage and max cpu
- storage - select nodes with enough cpu and max storage
- cost - select nodes with just enough cpu and storage, even if smaller nodes
*/
function selectClusterConfigs(specs: ResourceSpec, cloud: Cloud): ClusterSpec[] {
    return instanceTypes[cloud].map(instanceType => {
        const nodes = _.find(_.range(1, 300), n => (
            instanceType.vcpu * n >= specs.vcpu &&
            instanceType.memory * n >= specs.memory &&
            instanceType.storage * n >= specs.storage
        )) || 0
        return {instanceType, nodes}
    }).filter(({nodes}) => nodes > 0)
}
    
    
export function selectClusterInstances(
    workload: WorkloadSpec,
    replicationFactor: number,
    cloud: Cloud,
    perf: PerfModeData,
): ClusterSpec | undefined {
    const diskSpace = workload.storage * CompactionOverhead
    const recommendedResources: ResourceSpec = {
        vcpu: (workload.reads / perf.reads / 0.8 + workload.writes / perf.writes / 0.5) / itemSizePerfFactor(workload.itemSize),
        storage: diskSpace,
        memory: Math.ceil(workload.storage / RAMtoDataRatio)
    }
    
    const minimalResources: ResourceSpec = {
        ...recommendedResources,
        memory: Math.ceil(diskSpace / RAMtoDiskRatio)
    }
    
    const recommendedConfigs = selectClusterConfigs(recommendedResources, cloud)
    const minimalConfigs = selectClusterConfigs(minimalResources, cloud)
    
    const lowestPrice = _.chain(minimalConfigs)
    .map(ondemandPrice)
    .min()
    .value()
    
    const bestConfig = (configs: ClusterSpec[]) => _.chain(configs)
    .filter(spec => ondemandPrice(spec) < lowestPrice * 1.2)
    .sortBy('nodes')
    .head()
    .value()
    
    const selectedConfig = bestConfig(recommendedConfigs) || bestConfig(minimalConfigs)
    
    return {
        ...selectedConfig,
        nodes: selectedConfig.nodes*replicationFactor
    }
}


export function clusterCapacity(cluster: ClusterSpec, replicationFactor: number, perfMode: MODE = MODE.CQL) {
    const perf = vcpuPerf[perfMode]
    const totalResources = clusterResources(cluster)
    const dataset =
    totalResources.storage / replicationFactor / CompactionOverhead
    const peakLoad = (totalResources.vcpu * (perf.writes + perf.reads)) / 2 / replicationFactor
    const sustainedLoad = (totalResources.vcpu * (perf.writes * 0.5 + perf.reads*0.8) ) / 2 / replicationFactor
    
    return { sustainedLoad, peakLoad, dataset, ...totalResources }
}

export function prices(workload: WorkloadSpec, replicationFactor: number, cloud: Cloud = 'aws', perfMode: MODE = MODE.CQL) {
    const perf = vcpuPerf[perfMode]
    // currently, Scylla requires each replica to be in a different AZ
    const replicationTraffic =
    hoursPerMonth * 3600 * ((workload.reads + workload.writes) *
    workload.itemSize *
    (replicationFactor - 1)) /
    1e6 * DataThroughputAvgFactor
    const dataTransfer = replicationTraffic * AWSDataTransferPrice
    
    const cluster = selectClusterInstances(workload, replicationFactor, cloud, perf)!
    
    const prices = [
        {
            id: 'ondemand',
            name: 'On demand',
            compute: ondemandPrice(cluster),
            license: licensePrice(cluster, LicenseCorePriceYearly.onDemand)
        },
        {
            id: 'reserved',
            name: 'Reserved',
            compute: reservedPrice(cluster),
            license: licensePrice(cluster, LicenseCorePriceYearly.reserved)
        }
    ].map(priceSpec => {
        const {compute, license} = priceSpec
        return {
            ...priceSpec,
            dataTransfer,
            total: compute + license + dataTransfer
        }
    })
    
    return {prices, cluster}
}
